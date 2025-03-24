import "dotenv/config";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 古平町の情報（JSONファイル or 直接配列）
const furubiraData = [
  {
    title: "道の駅",
    content:
      "道の駅「ふるびらたらこミュージアム」は、北海道古平町の特産品であるたらこをテーマにした施設で、2025年4月15日にオープンしました。\n\n【施設の特徴】\n- **たらこに関する展示・体験**: 食やアート、学習など、たらこの世界を多角的に体験できる場を提供。\n- **建物のデザイン**: 内壁はたらこをイメージしたピンク色で統一され、訪れる人々に視覚的な楽しさを提供。\n- **施設内の設備**: 物販施設、飲食施設、観光情報発信コーナー、休憩施設、イベントスペース、ドッグランなどを完備。\n\n【アクセス情報】\n- **所在地**: 北海道古平郡古平町大字浜町40-4\n- **駐車場**: 普通車32台、大型車の駐車スペースも完備。\n\n【周辺の見どころ】\n道の駅の近隣には、古平町の民謡「たらつり節」に関する展示や、地域の文化を紹介するスペースも設けられており、訪問者は古平町の歴史や文化に触れることができます。\n\n【最新情報】\n建設中の様子やオープン前の情報は、古平町の公式Instagramアカウントで紹介されています。道の駅「ふるびらたらこミュージアム」は、たらこ好きや観光客にとって新たな魅力スポットとなっています。訪問の際は、最新の情報を公式サイトやSNSで確認することをおすすめします。",
  },
];

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
