import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import puppeteer from "puppeteer";
import { getUrls } from "./url.mjs";

const DEFAULT_OUT = "scripts/furubira_content.json";

function usage(exitCode = 0) {
  const msg = `
Usage:
  node scripts/scrapePage.mjs [--out <path>] [--scope <both|town|kanko>]

Options:
  --out <path>            Output JSON path (default: ${DEFAULT_OUT})
  --scope <both|town|kanko>  Which URLs to scrape (default: both)
`.trim();
  console.log(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    out: DEFAULT_OUT,
    scope: "both",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage(0);
    if (a === "--out") {
      const v = argv[++i];
      if (!v) throw new Error("--out requires a value");
      args.out = v;
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
    throw new Error(`Unknown argument: ${a}`);
  }

  return args;
}

async function fetchPageData(url) {
  const u = new URL(url);
  if (u.hostname === "furubira-kanko.com") {
    return await fetchPageDataWithPuppeteer(url);
  }
  return await fetchPageDataWithAxios(url);
}

async function fetchPageDataWithAxios(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // <head>内の<title>タグからタイトルを取得（無い場合はフォールバック）
    let title = $("head > title").text().trim();
    if (!title) title = String($('meta[property="og:title"]').attr("content") || "").trim();
    if (!title) title = $("h1").first().text().trim();
    if (!title) title = $("h2").first().text().trim();
    if (!title) title = url;

    // Try to extract the main readable content.
    // - town.furubira.lg.jp: `.column02-inr`
    // - furubira-kanko.com: main/article/body fallback
    $("script, style, noscript").remove();
    $("header, nav, footer").remove();

    let content = $(".column02-inr").text().trim();
    if (!content) content = $("main").text().trim();
    if (!content) content = $("article").text().trim();
    if (!content) content = $("body").text().trim();

    return { title, content };
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return null;
  }
}

let _browserPromise = null;
async function getBrowser() {
  if (_browserPromise) return _browserPromise;
  _browserPromise = puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return _browserPromise;
}

async function fetchPageDataWithPuppeteer(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });

    const result = await page.evaluate(() => {
      const remove = (sel) => {
        for (const el of Array.from(document.querySelectorAll(sel))) el.remove();
      };
      remove("script,style,noscript,header,nav,footer");

      const title =
        document.title?.trim() ||
        document.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim() ||
        document.querySelector("h1")?.textContent?.trim() ||
        document.querySelector("h2")?.textContent?.trim() ||
        "";

      const textFrom = (sel) => document.querySelector(sel)?.innerText?.trim() || "";
      let content = textFrom("main");
      if (!content) content = textFrom("article");
      if (!content) content = document.body?.innerText?.trim() || "";

      return { title, content };
    });

    return { title: result.title || url, content: result.content || "" };
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

async function createJsonFromUrls() {
  const args = parseArgs(process.argv.slice(2));
  const data = [];

  const urls = await getUrls({ scope: args.scope });

  for (const url of urls) {
    const pageData = await fetchPageData(url);
    if (pageData) {
      data.push(pageData);
    }
  }

  const outputPath = args.out;

  try {
    // ディレクトリの存在確認を省略し、直接ファイルに書き込む
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log(`Scraping completed and data saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error writing to file: ${error.message}`);
  } finally {
    if (_browserPromise) {
      const browser = await _browserPromise.catch(() => null);
      await browser?.close().catch(() => {});
    }
  }
}

createJsonFromUrls().catch((err) => {
  console.error("[scrapePage] fatal:", err?.message ?? err);
  process.exit(1);
});
