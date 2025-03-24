import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import { urls } from "./url.mjs";

async function fetchPageData(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // <head>内の<title>タグからタイトルを取得
    const title = $("head > title").text().trim();

    // .column02-inrクラス内のすべてのテキストを取得
    const content = $(".column02-inr").text().trim();

    return { title, content };
  } catch (error) {
    console.error(`Error fetching ${url}: ${error.message}`);
    return null;
  }
}

async function createJsonFromUrls() {
  const data = [];

  for (const url of urls) {
    const pageData = await fetchPageData(url);
    if (pageData) {
      data.push(pageData);
    }
  }

  // 静的にファイルパスを指定
  const outputPath = "./furubira_content.json";

  try {
    // ディレクトリの存在確認を省略し、直接ファイルに書き込む
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2));
    console.log("Scraping completed and data saved to furubira_content.json");
  } catch (error) {
    console.error(`Error writing to file: ${error.message}`);
  }
}

createJsonFromUrls();
