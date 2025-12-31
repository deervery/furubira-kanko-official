import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import xlsx from "xlsx";

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

function collectKeyCandidatesFromSheet(sheet) {
  // Collect ANY cell that looks like a dot-path key (e.g. "home.hero_title" / "cms.about_hometown_tax_program")
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  /** @type {Set<string>} */
  const keys = new Set();
  const re = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/i;

  for (const row of rows) {
    for (const cell of row) {
      if (typeof cell !== "string") continue;
      const s = cell.trim();
      if (!s) continue;
      if (re.test(s)) keys.add(s);
    }
  }
  return keys;
}

function readExcelKeys(excelPath) {
  const wb = xlsx.readFile(excelPath, { cellText: true, cellDates: false });
  /** @type {Set<string>} */
  const keys = new Set();

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    for (const k of collectKeyCandidatesFromSheet(sheet)) keys.add(k);
  }
  return keys;
}

function main() {
  const repoRoot = process.cwd();
  const excelPath = path.join(repoRoot, "英語対応_translationPj.xlsx");
  const messagesPath = path.join(repoRoot, "locales", "messages.json");
  const backupPath = path.join(repoRoot, "locales", `messages.json.bak.${Date.now()}`);

  if (!fs.existsSync(excelPath)) {
    console.error(`[sync] Excel not found: ${excelPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(messagesPath)) {
    console.error(`[sync] messages.json not found: ${messagesPath}`);
    process.exit(1);
  }

  const excelKeys = readExcelKeys(excelPath);
  if (excelKeys.size === 0) {
    console.error(
      "[sync] No dot-path keys found in the Excel file. Expected cells like 'home.hero_title' or 'cms.xxx'.",
    );
    process.exit(1);
  }

  const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
  const langs = Object.keys(messages);

  /** @type {Record<string, Record<string, unknown>>} */
  const flatByLang = {};
  for (const lang of langs) {
    flatByLang[lang] = flattenObject(messages[lang]);
  }

  // Candidate keys across all langs (union). We'll prune based on excelKeys.
  const allKeys = new Set();
  for (const lang of langs) {
    for (const k of Object.keys(flatByLang[lang])) allKeys.add(k);
  }

  const keysToRemove = [...allKeys].filter((k) => !excelKeys.has(k));

  // Print summary
  console.log(`[sync] Excel keys: ${excelKeys.size}`);
  console.log(`[sync] JSON keys (union): ${allKeys.size}`);
  console.log(`[sync] Keys to remove (not in Excel): ${keysToRemove.length}`);

  // Backup
  fs.copyFileSync(messagesPath, backupPath);
  console.log(`[sync] Backup created: ${path.relative(repoRoot, backupPath)}`);

  // Prune from each lang
  for (const lang of langs) {
    for (const k of keysToRemove) {
      delete flatByLang[lang][k];
    }
    messages[lang] = unflattenObject(flatByLang[lang]);
  }

  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2) + "\n", "utf8");
  console.log(`[sync] Updated: ${path.relative(repoRoot, messagesPath)}`);
}

main();


