import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SOURCE = "scripts/furubira_content.json";
const DEFAULT_MIN_CHARS = 300;
const DEFAULT_MAX_CHARS = 800;
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims

function usage(exitCode = 0) {
  const msg = `
Usage:
  node scripts/ingest-furubira-info.mjs [--source <path>] [--min-chars N] [--max-chars N] [--dry-run] [--delete]

Required env (unless --dry-run):
  OPENAI_API_KEY=...
  SUPABASE_URL=...                (or NEXT_PUBLIC_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY=...   (never expose to client)

Examples:
  node scripts/ingest-furubira-info.mjs --dry-run
  node scripts/ingest-furubira-info.mjs --source scripts/furubira_content.json
  node scripts/ingest-furubira-info.mjs --source scripts/furubira_content.json --delete
`.trim();
  // eslint-disable-next-line no-console
  console.log(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE,
    minChars: DEFAULT_MIN_CHARS,
    maxChars: DEFAULT_MAX_CHARS,
    dryRun: false,
    doDelete: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage(0);
    if (a === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (a === "--delete") {
      args.doDelete = true;
      continue;
    }
    if (a === "--source") {
      const v = argv[++i];
      if (!v) throw new Error("--source requires a value");
      args.source = v;
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
    throw new Error(`Unknown argument: ${a}`);
  }

  if (args.minChars > args.maxChars) {
    throw new Error(`min-chars (${args.minChars}) must be <= max-chars (${args.maxChars})`);
  }

  return args;
}

function normalizeText(input) {
  if (typeof input !== "string") return "";
  let s = input.normalize("NFKC");
  // normalize newlines
  s = s.replace(/\r\n?/g, "\n");
  // remove zero-width spaces
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // normalize spaces
  s = s.replace(/[\u00A0\u3000]/g, " ");
  // trim trailing spaces before newline (markdown "  \n" becomes "\n")
  s = s.replace(/[ \t]+\n/g, "\n");
  // collapse excessive horizontal whitespace (keep newlines)
  s = s.replace(/[ \t]{2,}/g, " ");
  // collapse too many blank lines
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
  // Split by natural boundaries (。 or newline), then pack into <= maxChars.
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
    // If a single piece is too long, hard-split it.
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

  // Merge short fragments with neighbors, aiming for minChars..maxChars.
  const chunks = [];
  let cur = "";
  for (const part of raw) {
    if (!cur) {
      cur = part;
      continue;
    }

    const glue = "\n\n";
    const candidate = `${cur}${glue}${part}`;

    // If current is too short, try to merge if it doesn't exceed maxChars.
    if (cur.length < minChars && candidate.length <= maxChars) {
      cur = candidate;
      continue;
    }

    // If merging still stays under maxChars, we can merge to reduce fragmentation.
    if (candidate.length <= maxChars && part.length < minChars / 2) {
      cur = candidate;
      continue;
    }

    chunks.push(cur.trim());
    cur = part;
  }
  if (cur) chunks.push(cur.trim());

  // Final pass: ensure no chunk exceeds maxChars (safety)
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

async function readSourceJson(sourcePath) {
  const abs = path.isAbsolute(sourcePath) ? sourcePath : path.join(process.cwd(), sourcePath);
  const raw = await fs.readFile(abs, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`Source JSON must be an array: ${sourcePath}`);
  const items = data
    .map((x, idx) => {
      const title = normalizeText(x?.title ?? "");
      const content = normalizeText(x?.content ?? "");
      return { idx, title, content };
    })
    .filter((x) => x.title && x.content);
  return { abs, items };
}

async function fetchExistingHashes(supabase, hashes) {
  const existing = new Set();
  const batchSize = 500;
  for (let i = 0; i < hashes.length; i += batchSize) {
    const batch = hashes.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("furubira_info")
      .select("content_hash")
      .in("content_hash", batch);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row?.content_hash) existing.add(row.content_hash);
    }
  }
  return existing;
}

async function embedBatch(openai, texts) {
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return resp.data.map((d) => d.embedding);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { abs: sourceAbs, items } = await readSourceJson(args.source);

  const allChunks = [];
  for (const item of items) {
    const chunks = chunkContent(item.content, { minChars: args.minChars, maxChars: args.maxChars });
    for (const chunk of chunks) {
      const contentHash = sha256Hex(chunk);
      allChunks.push({
        title: item.title,
        content: chunk,
        content_hash: contentHash,
        embedding_input: `${item.title}\n\n${chunk}`,
      });
    }
  }

  // dedupe by content_hash (safety)
  const byHash = new Map();
  for (const c of allChunks) {
    if (!byHash.has(c.content_hash)) byHash.set(c.content_hash, c);
  }
  const uniqueChunks = Array.from(byHash.values());
  const keepHashes = uniqueChunks.map((c) => c.content_hash);

  // eslint-disable-next-line no-console
  console.log(
    [
      `[ingest] source: ${sourceAbs}`,
      `[ingest] items: ${items.length}`,
      `[ingest] chunks: ${allChunks.length} (unique: ${uniqueChunks.length})`,
      `[ingest] params: minChars=${args.minChars} maxChars=${args.maxChars}`,
      `[ingest] model: ${EMBEDDING_MODEL}`,
      `[ingest] mode: ${args.dryRun ? "dry-run" : "write"}`,
      `[ingest] delete: ${args.doDelete ? "enabled" : "disabled"}`,
    ].join("\n")
  );

  if (args.dryRun) {
    return;
  }

  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) throw new Error("Missing required env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = requireEnv("OPENAI_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiKey });

  // 1) Determine which hashes already exist (skip embedding + insert)
  const existing = await fetchExistingHashes(supabase, keepHashes);
  const toCreate = uniqueChunks.filter((c) => !existing.has(c.content_hash));

  // eslint-disable-next-line no-console
  console.log(`[ingest] existing hashes: ${existing.size}`);
  // eslint-disable-next-line no-console
  console.log(`[ingest] to insert: ${toCreate.length}`);

  // 2) Embed + insert new rows
  const embedBatchSize = 64;
  const insertBatchSize = 200;

  let inserted = 0;
  for (let i = 0; i < toCreate.length; i += embedBatchSize) {
    const batch = toCreate.slice(i, i + embedBatchSize);
    const inputs = batch.map((b) => b.embedding_input);
    const embeddings = await embedBatch(openai, inputs);

    const rows = batch.map((b, idx) => ({
      title: b.title,
      content: b.content,
      content_hash: b.content_hash,
      embedding: embeddings[idx],
    }));

    // insert in smaller batches (PostgREST payload size)
    for (let j = 0; j < rows.length; j += insertBatchSize) {
      const sub = rows.slice(j, j + insertBatchSize);
      const { error } = await supabase.from("furubira_info").insert(sub);
      if (error) throw error;
      inserted += sub.length;
      // eslint-disable-next-line no-console
      console.log(`[ingest] inserted: ${inserted}/${toCreate.length}`);
    }
  }

  // 3) Purge rows not present in current ingest (optional)
  if (args.doDelete) {
    const { data, error } = await supabase.rpc("purge_furubira_info_not_in_hashes", {
      keep_hashes: keepHashes,
    });
    if (error) throw error;
    // eslint-disable-next-line no-console
    console.log(`[ingest] purged (deleted rows): ${data}`);
  }

  // eslint-disable-next-line no-console
  console.log("[ingest] done");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[ingest] fatal:", err?.message ?? err);
  process.exit(1);
});


