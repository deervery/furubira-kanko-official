import fs from "node:fs/promises";
import path from "node:path";

function usage(exitCode = 0) {
  const msg = `
Usage:
  node scripts/merge-furubira-content.mjs --into <path> --from <path> [--dry-run]

What it does:
  - Merges items from --from into --into (in-place by default)
  - Key preference: url (if present) else normalized title
  - Keeps existing items not present in --from

Options:
  --into <path>   Destination JSON array file (will be created if missing)
  --from <path>   Source JSON array file
  --dry-run       Print stats only; do not write
`.trim();
  console.log(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { into: null, from: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage(0);
    if (a === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (a === "--into") {
      const v = argv[++i];
      if (!v) throw new Error("--into requires a value");
      args.into = v;
      continue;
    }
    if (a === "--from") {
      const v = argv[++i];
      if (!v) throw new Error("--from requires a value");
      args.from = v;
      continue;
    }
    throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.into || !args.from) throw new Error("--into and --from are required");
  return args;
}

function normalizeUrl(u) {
  if (typeof u !== "string") return "";
  const s = u.trim();
  if (!s) return "";
  try {
    const url = new URL(s);
    for (const k of Array.from(url.searchParams.keys())) {
      if (k.toLowerCase().startsWith("utm_")) url.searchParams.delete(k);
    }
    return url.toString();
  } catch {
    return s;
  }
}

function normalizeTitle(title) {
  let t = typeof title === "string" ? title.normalize("NFKC").trim() : "";
  if (!t) return "";
  if (t.startsWith("｜")) t = t.slice(1).trim();
  const pipeIdx = t.indexOf("｜");
  if (pipeIdx !== -1) t = t.slice(0, pipeIdx).trim();
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function normalizeContent(content) {
  if (typeof content !== "string") return "";
  return content.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
}

function keyOf(item) {
  const url = normalizeUrl(item?.url ?? "");
  if (url) return `url:${url}`;
  const title = normalizeTitle(item?.title ?? "");
  if (title) return `title:${title}`;
  return "";
}

async function readJsonArray(filePath, { allowMissing = false } = {}) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  try {
    const raw = await fs.readFile(abs, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error(`JSON must be an array: ${filePath}`);
    return { abs, data };
  } catch (e) {
    if (allowMissing && (e?.code === "ENOENT" || String(e?.message || "").includes("no such file"))) {
      return { abs, data: [] };
    }
    throw e;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { abs: intoAbs, data: intoRaw } = await readJsonArray(args.into, { allowMissing: true });
  const { abs: fromAbs, data: fromRaw } = await readJsonArray(args.from);

  const into = intoRaw
    .map((x) => ({
      url: normalizeUrl(x?.url ?? ""),
      title: normalizeTitle(x?.title ?? ""),
      content: normalizeContent(x?.content ?? ""),
    }))
    .filter((x) => x.title && x.content);

  const from = fromRaw
    .map((x) => ({
      url: normalizeUrl(x?.url ?? ""),
      title: normalizeTitle(x?.title ?? ""),
      content: normalizeContent(x?.content ?? ""),
    }))
    .filter((x) => x.title && x.content);

  const byKey = new Map();
  for (const item of into) {
    const k = keyOf(item);
    if (!k) continue;
    byKey.set(k, item);
  }

  let updated = 0;
  let added = 0;
  for (const item of from) {
    const k = keyOf(item);
    if (!k) continue;
    if (byKey.has(k)) updated++;
    else added++;
    byKey.set(k, item);
  }

  const merged = Array.from(byKey.values());

  console.log(
    [
      `[merge-content] into: ${intoAbs} (${into.length} items)`,
      `[merge-content] from: ${fromAbs} (${from.length} items)`,
      `[merge-content] updated: ${updated}`,
      `[merge-content] added: ${added}`,
      `[merge-content] out: ${intoAbs} (${merged.length} items)`,
      `[merge-content] mode: ${args.dryRun ? "dry-run" : "write"}`,
    ].join("\n")
  );

  if (args.dryRun) return;
  await fs.writeFile(intoAbs, JSON.stringify(merged, null, 2), "utf8");
}

main().catch((err) => {
  console.error("[merge-content] fatal:", err?.message ?? err);
  process.exit(1);
});


