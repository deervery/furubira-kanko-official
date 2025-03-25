import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import dotenv from "dotenv";

// 環境変数を読み込む
dotenv.config();

// Supabaseの設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchDataAndSave() {
  try {
    console.log("Fetching data from Supabase...");

    // Supabaseからデータを取得
    const { data, error } = await supabase
      .from("furubira_info")
      .select("title, content");

    if (error) throw error;

    // JSONファイルとして保存
    const jsonData = JSON.stringify(data, null, 2);
    const filePath = "./scripts/furubira_info.json";
    await fs.writeFile(filePath, jsonData, "utf8");

    console.log(`✅ JSONファイルが保存されました: ${filePath}`);
  } catch (error) {
    console.error("❌ データ取得に失敗:", error.message);
  }
}

// スクリプトを実行
fetchDataAndSave();
