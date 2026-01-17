import dotenv from "dotenv";
import crypto from "node:crypto";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

// .env.local を優先的に読み込む
dotenv.config({ path: ".env.local" });
// .env.local がない場合は .env を読み込む
dotenv.config();

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims
const DEFAULT_MIN_CHARS = 300;
const DEFAULT_MAX_CHARS = 800;
const DEFAULT_BATCH_SIZE = 64;
const DEFAULT_EMBED_BATCH_SIZE = 64;

function usage(exitCode = 0) {
  const msg = `
Usage:
  node scripts/update-furubira-info.mjs [options]

Options:
  --ids <id1,id2,...>    特定のIDの行のみ処理（カンマ区切り）
  --null-hash             content_hash が NULL の行を処理（デフォルト）
  --null-embedding        embedding が NULL の行を処理
  --all                   すべての行を再処理（既存のhash/embeddingも上書き）
  --chunk                 長いcontentをチャンク化して複数行に分割
  --min-chars <N>         チャンク化時の最小文字数（デフォルト: ${DEFAULT_MIN_CHARS}）
  --max-chars <N>         チャンク化時の最大文字数（デフォルト: ${DEFAULT_MAX_CHARS}）
  --batch-size <N>        UPDATEのバッチサイズ（デフォルト: ${DEFAULT_BATCH_SIZE}）
  --embed-batch-size <N>  Embedding生成のバッチサイズ（デフォルト: ${DEFAULT_EMBED_BATCH_SIZE}）
  --limit <N>             処理する最大行数（デフォルト: 無制限）
  --dry-run               実際には更新せず、処理対象を表示するだけ

Required env:
  OPENAI_API_KEY=...
  SUPABASE_URL=...                (or NEXT_PUBLIC_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY=...   (never expose to client)

Examples:
  # content_hash が NULL の行を処理（デフォルト）
  node scripts/update-furubira-info.mjs

  # 特定のIDの行を処理
  node scripts/update-furubira-info.mjs --ids 123,456

  # チャンク化して処理
  node scripts/update-furubira-info.mjs --chunk --null-hash

  # すべての行を再処理
  node scripts/update-furubira-info.mjs --all
`.trim();
  console.log(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    ids: null,
    nullHash: false,
    nullEmbedding: false,
    all: false,
    chunk: false,
    minChars: DEFAULT_MIN_CHARS,
    maxChars: DEFAULT_MAX_CHARS,
    batchSize: DEFAULT_BATCH_SIZE,
    embedBatchSize: DEFAULT_EMBED_BATCH_SIZE,
    limit: null,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage(0);
    if (a === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (a === "--null-hash") {
      args.nullHash = true;
      continue;
    }
    if (a === "--null-embedding") {
      args.nullEmbedding = true;
      continue;
    }
    if (a === "--all") {
      args.all = true;
      continue;
    }
    if (a === "--chunk") {
      args.chunk = true;
      continue;
    }
    if (a === "--ids") {
      const v = argv[++i];
      if (!v) throw new Error("--ids requires a value");
      args.ids = v.split(",").map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));
      continue;
    }
    if (a === "--min-chars") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) throw new Error("--min-chars must be a positive number");
      args.minChars = Math.floor(v);
      continue;
    }
    if (a === "--max-chars") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) throw new Error("--max-chars must be a positive number");
      args.maxChars = Math.floor(v);
      continue;
    }
    if (a === "--batch-size") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) throw new Error("--batch-size must be a positive number");
      args.batchSize = Math.floor(v);
      continue;
    }
    if (a === "--embed-batch-size") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) throw new Error("--embed-batch-size must be a positive number");
      args.embedBatchSize = Math.floor(v);
      continue;
    }
    if (a === "--limit") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) throw new Error("--limit must be a positive number");
      args.limit = Math.floor(v);
      continue;
    }
    throw new Error(`Unknown argument: ${a}`);
  }

  if (args.minChars > args.maxChars) {
    throw new Error(`min-chars (${args.minChars}) must be <= max-chars (${args.maxChars})`);
  }

  // デフォルト: null-hash
  if (!args.ids && !args.nullHash && !args.nullEmbedding && !args.all) {
    args.nullHash = true;
  }

  return args;
}

function normalizeText(input) {
  if (typeof input !== "string") return "";
  let s = input.normalize("NFKC");
  s = s.replace(/\r\n?/g, "\n");
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  s = s.replace(/[\u00A0\u3000]/g, " ");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function splitParagraphs(text) {
  const t = normalizeText(text);
  if (!t) return [];
  return t
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitLongParagraph(paragraph, maxChars) {
  const parts = [];
  let buf = "";
  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    buf += ch;
    if (ch === "。" || ch === "\n") {
      parts.push(buf);
      buf = "";
    }
  }
  if (buf) parts.push(buf);

  const packed = [];
  let cur = "";
  for (const p of parts) {
    const candidate = cur ? `${cur}${p}` : p;
    if (candidate.length <= maxChars) {
      cur = candidate;
      continue;
    }
    if (cur) packed.push(cur.trim());
    if (p.length > maxChars) {
      let start = 0;
      while (start < p.length) {
        packed.push(p.slice(start, start + maxChars).trim());
        start += maxChars;
      }
      cur = "";
    } else {
      cur = p;
    }
  }
  if (cur) packed.push(cur.trim());
  return packed.filter(Boolean);
}

function chunkContent(content, { minChars, maxChars }) {
  const paras = splitParagraphs(content);
  const raw = [];
  for (const para of paras) {
    if (para.length <= maxChars) raw.push(para);
    else raw.push(...splitLongParagraph(para, maxChars));
  }

  const chunks = [];
  let cur = "";
  for (const part of raw) {
    if (!cur) {
      cur = part;
      continue;
    }

    const glue = "\n\n";
    const candidate = `${cur}${glue}${part}`;

    if (cur.length < minChars && candidate.length <= maxChars) {
      cur = candidate;
      continue;
    }

    if (candidate.length <= maxChars && part.length < minChars / 2) {
      cur = candidate;
      continue;
    }

    chunks.push(cur.trim());
    cur = part;
  }
  if (cur) chunks.push(cur.trim());

  const finalChunks = [];
  for (const c of chunks) {
    if (c.length <= maxChars) finalChunks.push(c);
    else finalChunks.push(...splitLongParagraph(c, maxChars));
  }

  return finalChunks.map((c) => normalizeText(c)).filter(Boolean);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

async function embedBatch(openai, texts) {
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
}

async function fetchRows(supabase, args) {
  let query = supabase.from("furubira_info").select("id, title, content, content_hash");

  if (args.ids) {
    query = query.in("id", args.ids);
  } else if (args.all) {
    // すべての行
  } else if (args.nullHash) {
    query = query.is("content_hash", null);
  } else if (args.nullEmbedding) {
    query = query.is("embedding", null);
  }

  if (args.limit) {
    query = query.limit(args.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function processRow(supabase, openai, row, args) {
  const normalizedContent = normalizeText(row.content || "");
  if (!normalizedContent) {
    console.log(`[update] Skipping row ${row.id}: empty content`);
    return { skipped: true, reason: "empty content" };
  }

  if (args.chunk) {
    // チャンク化モード: 複数行に分割
    const chunks = chunkContent(normalizedContent, {
      minChars: args.minChars,
      maxChars: args.maxChars,
    });

    if (chunks.length === 0) {
      console.log(`[update] Skipping row ${row.id}: no valid chunks`);
      return { skipped: true, reason: "no valid chunks" };
    }

    if (chunks.length === 1) {
      // 1チャンクのみ: 通常処理
      return await processSingleRow(supabase, openai, row, chunks[0], args);
    }

    // 複数チャンク: 元の行を更新し、残りは新規INSERT
    console.log(`[update] Row ${row.id}: splitting into ${chunks.length} chunks`);
    const results = [];

    // 最初のチャンクで元の行を更新
    const firstResult = await processSingleRow(supabase, openai, row, chunks[0], args);
    results.push(firstResult);

    // 残りのチャンクを新規INSERT
    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contentHash = sha256Hex(chunk);
      const embeddingInput = `${row.title || ""}\n\n${chunk}`;
      const embeddingResponse = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: embeddingInput,
      });
      const embedding = embeddingResponse.data[0]?.embedding;

      if (!embedding) {
        console.error(`[update] Chunk ${i + 1} of row ${row.id}: failed to generate embedding`);
        continue;
      }

      if (args.dryRun) {
        console.log(`[dry-run] Row ${row.id}: would insert chunk ${i + 1}/${chunks.length} with hash ${contentHash.substring(0, 16)}...`);
        results.push({ dryRun: true, chunkIndex: i + 1 });
        continue;
      }

      const { error: insertError } = await supabase.from("furubira_info").insert({
        title: row.title,
        content: chunk,
        content_hash: contentHash,
        embedding: embedding,
      });

      if (insertError) {
        console.error(`[update] Chunk ${i + 1} of row ${row.id}: insert failed:`, insertError);
        continue;
      }

      console.log(`[update] Row ${row.id}: chunk ${i + 1}/${chunks.length} inserted`);
      results.push({ inserted: true, chunkIndex: i + 1 });
    }

    return { chunked: true, results };
  } else {
    // 通常モード: 1行として処理
    return await processSingleRow(supabase, openai, row, normalizedContent, args);
  }
}

async function processSingleRow(supabase, openai, row, content, args) {
  const contentHash = sha256Hex(content);
  const embeddingInput = `${row.title || ""}\n\n${content}`;

  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: embeddingInput,
  });
  const embedding = embeddingResponse.data[0]?.embedding;

  if (!embedding) {
    throw new Error(`Failed to generate embedding for row ${row.id}`);
  }

  if (args.dryRun) {
    console.log(`[dry-run] Row ${row.id}: would update with hash ${contentHash.substring(0, 16)}...`);
    return { dryRun: true };
  }

  const { error: updateError } = await supabase
    .from("furubira_info")
    .update({
      content_hash: contentHash,
      embedding: embedding,
    })
    .eq("id", row.id);

  if (updateError) {
    throw new Error(`Update failed for row ${row.id}: ${updateError.message}`);
  }

  return { updated: true, hash: contentHash.substring(0, 16) + "..." };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(
    [
      `[update] mode: ${args.dryRun ? "dry-run" : "write"}`,
      `[update] filter: ${args.ids ? `ids=${args.ids.join(",")}` : args.all ? "all" : args.nullHash ? "null-hash" : args.nullEmbedding ? "null-embedding" : "none"}`,
      `[update] chunk: ${args.chunk ? `enabled (${args.minChars}-${args.maxChars} chars)` : "disabled"}`,
      `[update] batch-size: ${args.batchSize}, embed-batch-size: ${args.embedBatchSize}`,
      args.limit ? `[update] limit: ${args.limit}` : null,
    ]
      .filter(Boolean)
      .join("\n")
  );

  if (args.dryRun) {
    console.log("[update] DRY-RUN mode: no changes will be made");
  }

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    console.error("[update] Available env vars:", {
      SUPABASE_URL: process.env.SUPABASE_URL ? "***" : "not set",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "***" : "not set",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "***" : "not set",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "***" : "not set",
    });
    throw new Error("Missing required env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  }
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = requireEnv("OPENAI_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiKey });

  // 1) 処理対象の行を取得
  const rows = await fetchRows(supabase, args);

  if (rows.length === 0) {
    console.log("[update] No rows found to process");
    return;
  }

  console.log(`[update] Found ${rows.length} rows to process`);

  // 2) バッチ処理
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += args.batchSize) {
    const batch = rows.slice(i, i + args.batchSize);
    console.log(`[update] Processing batch ${Math.floor(i / args.batchSize) + 1} (${batch.length} rows)...`);

    for (const row of batch) {
      try {
        const result = await processRow(supabase, openai, row, args);
        processed++;
        if (result.skipped) {
          skipped++;
        } else if (result.dryRun || result.updated || result.inserted) {
          succeeded++;
        }
      } catch (error) {
        failed++;
        console.error(`[update] Row ${row.id}: error:`, error.message);
      }
    }
  }

  console.log(
    [
      `[update] done`,
      `[update] processed: ${processed}, succeeded: ${succeeded}, failed: ${failed}, skipped: ${skipped}`,
    ].join("\n")
  );
}

main().catch((err) => {
  console.error("[update] fatal:", err?.message ?? err);
  process.exit(1);
});

