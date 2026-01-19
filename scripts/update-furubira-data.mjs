import { spawn } from "node:child_process";

const DEFAULT_SCOPE = "both";
const DEFAULT_SOURCE = "scripts/furubira_content.json";

function usage(exitCode = 0) {
  const msg = `
Usage:
  node scripts/update-furubira-data.mjs [options]

Options:
  --scope <both|town|kanko>   Which URLs to scrape (default: ${DEFAULT_SCOPE})
  --source <path>             JSON path used between steps (default: ${DEFAULT_SOURCE})
  --run-fix-content           Run scripts/fixContent.mjs (costs OpenAI tokens)
  --dry-run                   Pass --dry-run to ingest (no DB writes)
  --delete                    Pass --delete to ingest (purge missing hashes; needs RPC)
  -h, --help                  Show help

Examples:
  # Town only, dry-run
  node scripts/update-furubira-data.mjs --scope town --dry-run

  # Both sites, write to DB
  node scripts/update-furubira-data.mjs --scope both
`.trim();
  console.log(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    scope: DEFAULT_SCOPE,
    source: DEFAULT_SOURCE,
    runFixContent: false,
    dryRun: false,
    doDelete: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage(0);
    if (a === "--run-fix-content") {
      args.runFixContent = true;
      continue;
    }
    if (a === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (a === "--delete") {
      args.doDelete = true;
      continue;
    }
    if (a === "--scope") {
      const v = argv[++i];
      if (!v) throw new Error("--scope requires a value");
      if (v !== "both" && v !== "town" && v !== "kanko") {
        throw new Error("--scope must be one of: both, town, kanko");
      }
      args.scope = v;
      continue;
    }
    if (a === "--source") {
      const v = argv[++i];
      if (!v) throw new Error("--source requires a value");
      args.source = v;
      continue;
    }
    throw new Error(`Unknown argument: ${a}`);
  }

  return args;
}

function run(cmd, cmdArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${cmd} ${cmdArgs.join(" ")}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // 1) Scrape
  await run(process.execPath, ["scripts/scrapePage.mjs", "--scope", args.scope, "--out", args.source]);

  // 2) Optional cleanup (OpenAI; costs money)
  if (args.runFixContent) {
    await run(process.execPath, ["scripts/fixContent.mjs", "--source", args.source, "--out", args.source]);
  }

  // 3) Ingest (diff update)
  const ingestArgs = ["scripts/ingest-furubira-info.mjs", "--source", args.source];
  if (args.dryRun) ingestArgs.push("--dry-run");
  if (args.doDelete) ingestArgs.push("--delete");
  await run(process.execPath, ingestArgs);
}

main().catch((err) => {
  console.error("[update-furubira-data] fatal:", err?.message ?? err);
  process.exit(1);
});


