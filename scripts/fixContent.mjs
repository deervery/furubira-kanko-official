import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs/promises";

// .envファイルの環境変数を読み込む
dotenv.config();

const DEFAULT_SOURCE = "scripts/furubira_content.json";
const DEFAULT_OUT = "scripts/furubira_content.json";

function usage(exitCode = 0) {
  const msg = `
Usage:
  node scripts/fixContent.mjs [--source <path>] [--out <path>]

Options:
  --source <path>   Input JSON path (default: ${DEFAULT_SOURCE})
  --out <path>      Output JSON path (default: ${DEFAULT_OUT})
`.trim();
  console.log(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { source: DEFAULT_SOURCE, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage(0);
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
  const args = parseArgs(process.argv.slice(2));

  // `cleanContent` は in-place 更新なので、出力先が異なる場合はコピーしてから更新する
  if (args.source !== args.out) {
    const raw = await fs.readFile(args.source, "utf-8");
    await fs.writeFile(args.out, raw, "utf-8");
  }

  await cleanContent(args.out);
  console.log(`Content has been cleaned and updated in ${args.out}`);
})();
