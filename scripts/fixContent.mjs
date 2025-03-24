import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs/promises";

// .envファイルの環境変数を読み込む
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // .envからAPIキーを取得
});

async function cleanContent(filePath) {
  // JSONファイルを読み込む
  const data = await fs.readFile(filePath, "utf-8");
  const items = JSON.parse(data);

  const cleanedItems = [];

  for (const item of items) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that extracts the main content from articles.",
          },
          {
            role: "user",
            content: `Please extract the main content from the following text, removing any unnecessary parts: ${item.content}`,
          },
        ],
      });

      const mainContent =
        response.choices[0]?.message?.content || "内容を抽出できませんでした。";
      cleanedItems.push({ ...item, content: mainContent });
    } catch (error) {
      console.error(`Error processing item with id ${item.id}:`, error);
      cleanedItems.push({ ...item, content: "エラーが発生しました。" });
    }
  }

  // 修正された内容をJSONファイルに書き込む
  await fs.writeFile(filePath, JSON.stringify(cleanedItems, null, 2), "utf-8");
}

(async () => {
  const filePath = "./furubira_content.json";
  await cleanContent(filePath);
  console.log("Content has been cleaned and updated in furubira_content.json");
})();
