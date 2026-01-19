import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_SOURCE = "scripts/furubira_content.both.json";
const DEFAULT_OUT = "scripts/furubira_info.json";

function usage(exitCode = 0) {
  const msg = `
Usage:
  node scripts/build-furubira-info.mjs [--source <path>] [--out <path>] [--dry-run]

What it does:
  - Converts a content JSON array (may include url) into a {title, content} array
  - Filters out empty title/content

Options:
  --source <path>   Input JSON (default: ${DEFAULT_SOURCE})
  --out <path>      Output JSON (default: ${DEFAULT_OUT})
  --dry-run         Print stats only; do not write
`.trim();
  console.log(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE, out: DEFAULT_OUT, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage(0);
    if (a === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (a === "--source") {
      const v = argv[++i];
      if (!v) throw new Error("--source requires a value");
      args.source = v;
      continue;
    }
    if (a === "--out") {
      const v = argv[++i];
      if (!v) throw new Error("--out requires a value");
      args.out = v;
      continue;
    }
    throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function normalizeText(x) {
  if (typeof x !== "string") return "";
  return x.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
}

async function readJsonArray(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = await fs.readFile(abs, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`JSON must be an array: ${filePath}`);
  return { abs, data };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { abs: srcAbs, data } = await readJsonArray(args.source);

  const out = data
    .map((x) => ({ title: normalizeText(x?.title ?? ""), content: normalizeText(x?.content ?? "") }))
    .filter((x) => x.title && x.content);

  const outAbs = path.isAbsolute(args.out) ? args.out : path.join(process.cwd(), args.out);
  console.log(`[build-info] source: ${srcAbs}`);
  console.log(`[build-info] items: ${out.length}`);
  console.log(`[build-info] out: ${outAbs}`);
  console.log(`[build-info] mode: ${args.dryRun ? "dry-run" : "write"}`);

  if (args.dryRun) return;
  await fs.writeFile(outAbs, JSON.stringify(out, null, 2), "utf8");
}

main().catch((err) => {
  console.error("[build-info] fatal:", err?.message ?? err);
  process.exit(1);
});


