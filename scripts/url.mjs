import axios from "axios";
import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import path from "node:path";

const TOWN_ORIGIN = "https://www.town.furubira.lg.jp";
const TOWN_INFO_INDEX = `${TOWN_ORIGIN}/info/`;
const DEFAULT_KANKO_ORIGIN = "https://furubira-kanko.com";

function uniq(arr) {
  return Array.from(new Set(arr));
}

function normalizeUrl(u) {
  // drop utm_* to avoid duplicates
  const url = new URL(u);
  for (const k of Array.from(url.searchParams.keys())) {
    if (k.toLowerCase().startsWith("utm_")) url.searchParams.delete(k);
  }
  // keep trailing slash normalization stable
  return url.toString();
}

async function fetchHtml(url) {
  const resp = await axios.get(url, {
    timeout: 30_000,
    headers: {
      "User-Agent": "furubira-kanko-batch/1.0 (+https://furubira-kanko.com)",
      Accept: "text/html,application/xhtml+xml",
    },
    maxRedirects: 5,
  });
  return resp.data;
}

/**
 * 町公式「新着情報」から /info/ 配下の詳細URLを自動収集する。
 * - ページネーションを辿る（ただし安全のため上限あり）
 * - /info/detail.php?id=... 形式のリンクを主に収集
 */
export async function fetchTownInfoUrls({
  maxPages = 5,
  maxUrls = 200,
} = {}) {
  const toVisit = [TOWN_INFO_INDEX];
  const visited = new Set();
  const detailUrls = new Set();

  while (toVisit.length > 0 && visited.size < maxPages && detailUrls.size < maxUrls) {
    const pageUrl = toVisit.shift();
    if (!pageUrl || visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    let html;
    try {
      html = await fetchHtml(pageUrl);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[url] failed to fetch: ${pageUrl} (${e?.message ?? e})`);
      continue;
    }

    const $ = cheerio.load(html);
    const base = new URL(pageUrl);

    const anchors = $("a[href]")
      .map((_, el) => String($(el).attr("href") || "").trim())
      .get()
      .filter(Boolean);

    for (const href of anchors) {
      let abs;
      try {
        abs = new URL(href, base).toString();
      } catch {
        continue;
      }

      const u = new URL(abs);
      if (u.origin !== TOWN_ORIGIN) continue;
      if (!u.pathname.startsWith("/info/")) continue;

      const isDetail = u.pathname.includes("detail.php") && (u.searchParams.get("id") || "").length > 0;
      if (isDetail) {
        detailUrls.add(normalizeUrl(u.toString()));
        if (detailUrls.size >= maxUrls) break;
        continue;
      }

      // likely list/pagination pages under /info/
      const isList =
        u.pathname === "/info/" ||
        (u.pathname.endsWith("/info/") && u.searchParams.has("page")) ||
        u.searchParams.has("page");

      if (isList) {
        const normalized = normalizeUrl(u.toString());
        if (!visited.has(normalized) && !toVisit.includes(normalized) && visited.size + toVisit.length < maxPages) {
          toVisit.push(normalized);
        }
      }
    }
  }

  return Array.from(detailUrls);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

/**
 * 観光協会サイトのURLを「このリポジトリのルーティング」から生成する。
 * 対象: app/[lang]/.../page.tsx などの静的ルートのみ（動的セグメントは除外）
 */
export async function getKankoUrlsFromAppRoutes({
  origin = DEFAULT_KANKO_ORIGIN,
  lang = "ja",
} = {}) {
  const baseDir = path.join(process.cwd(), "app", "[lang]");
  const files = await walk(baseDir);

  const pageFiles = files.filter((p) => {
    const bn = path.basename(p);
    if (!bn.startsWith("page.")) return false;
    if (!bn.endsWith(".tsx") && !bn.endsWith(".ts") && !bn.endsWith(".jsx") && !bn.endsWith(".js")) return false;
    return true;
  });

  const urls = [];
  for (const file of pageFiles) {
    const rel = path.relative(baseDir, file);
    // rel examples:
    // - page.tsx
    // - spots\\page.tsx
    // - events\\page.tsx
    const parts = rel.split(path.sep).filter(Boolean);
    if (parts.length === 0) continue;
    if (parts.some((s) => s.includes("[") || s.includes("]"))) continue; // exclude dynamic segments

    // drop the last segment "page.tsx"
    const segs = parts.slice(0, -1);
    const route = segs.length === 0 ? `/${lang}` : `/${lang}/${segs.join("/")}`;
    urls.push(normalizeUrl(new URL(route, origin).toString()));
  }

  return uniq(urls).sort();
}

/**
 * scope:\n+ * - town: 町公式 info のみ\n+ * - kanko: 観光協会（ルーティング由来）のみ\n+ * - both: 両方\n+ */
export async function getUrls({
  scope = "both",
  kankoOrigin = DEFAULT_KANKO_ORIGIN,
  kankoLang = "ja",
  townInfoMaxPages = 5,
  townInfoMaxUrls = 200,
} = {}) {
  if (scope !== "both" && scope !== "town" && scope !== "kanko") {
    throw new Error("scope must be one of: both, town, kanko");
  }

  const urls = [];
  if (scope === "both" || scope === "town") {
    const town = await fetchTownInfoUrls({ maxPages: townInfoMaxPages, maxUrls: townInfoMaxUrls });
    urls.push(...town);
  }
  if (scope === "both" || scope === "kanko") {
    const kanko = await getKankoUrlsFromAppRoutes({ origin: kankoOrigin, lang: kankoLang });
    urls.push(...kanko);
  }

  return uniq(urls);
}
