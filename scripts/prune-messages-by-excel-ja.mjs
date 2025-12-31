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

function normalizeJaText(s) {
  if (typeof s !== "string") return "";
  return (
    s
      // normalize newlines
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // normalize full-width spaces
      .replace(/\u3000/g, " ")
      // collapse whitespace (including newlines)
      .replace(/\s+/g, " ")
      .trim()
  );
}

function readExcelJapaneseSet(excelPath) {
  const wb = xlsx.readFile(excelPath, { cellText: true });
  /** @type {Set<string>} */
  const jaSet = new Set();

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
    if (rows.length === 0) continue;

    const header = rows[0].map((c) => String(c).trim());
    const jaIdx = header.findIndex((h) => h === "日本語");
    if (jaIdx < 0) {
      console.warn(`[prune] Sheet "${sheetName}": no '日本語' column found, skipping`);
      continue;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const raw = String(row[jaIdx] ?? "").trim();
      const norm = normalizeJaText(raw);
      if (norm) jaSet.add(norm);
    }
  }

  return jaSet;
}

function mdEscape(s) {
  return String(s).replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
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

function main() {
  const repoRoot = process.cwd();
  const excelPath = path.join(repoRoot, "英語対応_translationPj.xlsx");
  const messagesPath = path.join(repoRoot, "locales", "messages.json");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(repoRoot, "locales", `messages.json.bak.${ts}`);
  const reportPath = path.join(repoRoot, "docs", `translation-prune-report.${ts}.md`);

  if (!fs.existsSync(excelPath)) {
    console.error(`[prune] Excel not found: ${excelPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(messagesPath)) {
    console.error(`[prune] messages.json not found: ${messagesPath}`);
    process.exit(1);
  }

  const excelJaSet = readExcelJapaneseSet(excelPath);
  if (excelJaSet.size === 0) {
    console.error("[prune] No Japanese strings were extracted from Excel (column '日本語').");
    process.exit(1);
  }

  const messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
  if (!messages.ja || typeof messages.ja !== "object") {
    console.error("[prune] messages.json must contain top-level 'ja' object.");
    process.exit(1);
  }
  if (!messages.en || typeof messages.en !== "object") {
    console.error("[prune] messages.json must contain top-level 'en' object.");
    process.exit(1);
  }

  const flatJa = flattenObject(messages.ja);
  const flatEn = flattenObject(messages.en);

  const referencedKeys = collectReferencedKeys(repoRoot);
  console.log(`[prune] Referenced keys found in code: ${referencedKeys.size}`);

  const allKeys = new Set([...Object.keys(flatJa), ...Object.keys(flatEn)]);

  /** @type {Array<{key: string, ja: unknown, en: unknown, jaNorm: string}>} */
  const removals = [];
  /** @type {Array<{key: string, reason: string}>} */
  const kept = [];

  for (const key of allKeys) {
    if (referencedKeys.has(key)) {
      kept.push({ key, reason: "referenced-by-code" });
      continue;
    }
    const jaVal = flatJa[key];
    // Only prune if ja value is a string. If missing/non-string, keep (conservative).
    if (typeof jaVal !== "string") continue;

    const jaNorm = normalizeJaText(jaVal);
    if (!jaNorm) continue;

    if (!excelJaSet.has(jaNorm)) {
      removals.push({ key, ja: jaVal, en: flatEn[key], jaNorm });
    }
  }

  console.log(`[prune] Excel '日本語' unique strings: ${excelJaSet.size}`);
  console.log(`[prune] JSON keys (union): ${allKeys.size}`);
  console.log(`[prune] Keys to remove (ja string not found in Excel): ${removals.length}`);
  console.log(`[prune] Keys kept (protected): ${kept.length}`);

  // Backup before writing
  fs.copyFileSync(messagesPath, backupPath);
  console.log(`[prune] Backup created: ${path.relative(repoRoot, backupPath)}`);

  // Apply pruning (remove from both languages)
  for (const r of removals) {
    delete flatJa[r.key];
    delete flatEn[r.key];
  }
  messages.ja = unflattenObject(flatJa);
  messages.en = unflattenObject(flatEn);

  fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2) + "\n", "utf8");
  console.log(`[prune] Updated: ${path.relative(repoRoot, messagesPath)}`);

  // Write report
  const lines = [];
  lines.push(`# 翻訳辞書の削除レポート（Excel照合: 日本語文ベース）`);
  lines.push("");
  lines.push(`- 実行日時: ${new Date().toLocaleString()}`);
  lines.push(`- Excel: \`${path.basename(excelPath)}\``);
  lines.push(`- JSON: \`locales/messages.json\``);
  lines.push(`- バックアップ: \`${path.relative(repoRoot, backupPath)}\``);
  lines.push("");
  lines.push("## サマリ");
  lines.push("");
  lines.push(`- Excelの日本語文（重複除去）: **${excelJaSet.size}**`);
  lines.push(`- JSONキー数（ja/enの和集合）: **${allKeys.size}**`);
  lines.push(`- 削除キー数: **${removals.length}**`);
  lines.push(`- 保護キー数: **${kept.length}**（コード参照）`);
  lines.push("");
  lines.push("## 削除したキー一覧");
  lines.push("");
  lines.push("> 基準: `messages.ja` の文字列を正規化して、Excel「日本語」列の文字列に存在しないものを削除");
  lines.push("");

  for (const r of removals) {
    lines.push(`- **${mdEscape(r.key)}**`);
    lines.push(`  - ja: ${mdEscape(r.ja)}`);
    if (typeof r.en === "string") {
      lines.push(`  - en: ${mdEscape(r.en)}`);
    } else if (r.en == null) {
      lines.push(`  - en: (missing)`);
    } else {
      lines.push(`  - en: (non-string)`);
    }
  }

  if (kept.length) {
    lines.push("");
    lines.push("## 保護したキー一覧");
    lines.push("");
    for (const k of kept) {
      lines.push(`- **${mdEscape(k.key)}** (${mdEscape(k.reason)})`);
    }
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n") + "\n", "utf8");
  console.log(`[prune] Report: ${path.relative(repoRoot, reportPath)}`);
}

main();


