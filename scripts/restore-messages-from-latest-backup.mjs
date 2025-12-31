import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function flattenObject(obj, prefix = "") {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenObject(v, p));
    } else {
      out[p] = v;
    }
  }
  return out;
}

function unflattenObject(flat) {
  /** @type {Record<string, any>} */
  const root = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split(".");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        cur[part] = v;
      } else {
        cur[part] ??= {};
        cur = cur[part];
      }
    }
  }
  return root;
}

function listFilesRecursive(dir, exts) {
  /** @type {string[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      out.push(...listFilesRecursive(p, exts));
    } else {
      if (exts.includes(path.extname(ent.name))) out.push(p);
    }
  }
  return out;
}

function collectReferencedKeys(repoRoot) {
  const files = listFilesRecursive(repoRoot, [".ts", ".tsx", ".js", ".mjs"]);

  /** @type {Set<string>} */
  const keys = new Set();
  const dotKeyRe = /[a-z0-9_]+(\.[a-z0-9_]+)+/i;

  // t(messages, "x.y") pattern
  const tCallRe = /t\(\s*messages\s*,\s*["'`]([^"'`]+)["'`]\s*\)/g;
  // { key: "x.y" } pattern (navigation arrays)
  const keyFieldRe = /\bkey\s*:\s*["'`]([^"'`]+)["'`]/g;

  for (const f of files) {
    const s = fs.readFileSync(f, "utf8");
    for (const re of [tCallRe, keyFieldRe]) {
      let m;
      while ((m = re.exec(s))) {
        const k = (m[1] ?? "").trim();
        if (k && dotKeyRe.test(k)) keys.add(k);
      }
    }
  }

  return keys;
}

function findLatestBackup(localesDir) {
  const files = fs
    .readdirSync(localesDir)
    .filter((f) => f.startsWith("messages.json.bak."))
    .map((f) => path.join(localesDir, f));
  if (files.length === 0) return null;
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

function main() {
  const repoRoot = process.cwd();
  const localesDir = path.join(repoRoot, "locales");
  const messagesPath = path.join(localesDir, "messages.json");

  const backupPath = findLatestBackup(localesDir);
  if (!backupPath) {
    console.error("[restore] No backup found (expected locales/messages.json.bak.*).");
    process.exit(1);
  }

  const current = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));

  const referencedKeys = collectReferencedKeys(repoRoot);
  console.log(`[restore] Referenced keys found in code: ${referencedKeys.size}`);
  console.log(`[restore] Using backup: ${path.relative(repoRoot, backupPath)}`);

  const langs = ["ja", "en"].filter((l) => current[l] && backup[l]);
  if (langs.length === 0) {
    console.error("[restore] Could not find matching ja/en objects in current+backup.");
    process.exit(1);
  }

  const flatCurrent = Object.fromEntries(langs.map((l) => [l, flattenObject(current[l])]));
  const flatBackup = Object.fromEntries(langs.map((l) => [l, flattenObject(backup[l])]));

  /** @type {string[]} */
  const restored = [];
  /** @type {string[]} */
  const missingInBackup = [];

  for (const k of referencedKeys) {
    for (const lang of langs) {
      if (flatCurrent[lang][k] == null) {
        if (flatBackup[lang][k] != null) {
          flatCurrent[lang][k] = flatBackup[lang][k];
          restored.push(`${lang}:${k}`);
        } else {
          missingInBackup.push(`${lang}:${k}`);
        }
      }
    }
  }

  for (const lang of langs) {
    current[lang] = unflattenObject(flatCurrent[lang]);
  }

  fs.writeFileSync(messagesPath, JSON.stringify(current, null, 2) + "\n", "utf8");
  console.log(`[restore] Updated: locales/messages.json`);
  console.log(`[restore] Restored entries: ${restored.length}`);
  if (missingInBackup.length) {
    console.log(`[restore] Missing in backup (still not restored): ${missingInBackup.length}`);
  }
}

main();


