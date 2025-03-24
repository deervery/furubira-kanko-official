import "dotenv/config";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// JSONファイルからデータを読み込む
const furubiraData = JSON.parse(
  fs.readFileSync("furubira_content.json", "utf8")
);

export async function insertFurubiraData() {
  for (const item of furubiraData) {
    // OpenAI API を使って embedding を生成
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: item.content,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Supabase にデータを挿入
    const { error } = await supabase.from("furubira_info").insert([
      {
        title: item.title,
        content: item.content,
        embedding,
      },
    ]);

    if (error) {
      console.error(`Error inserting data: ${error.message}`);
    } else {
      console.log(`Inserted: ${item.title}`);
    }
  }
}

// スクリプトを実行
insertFurubiraData();
