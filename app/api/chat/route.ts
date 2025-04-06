import { OpenAI } from "openai";
import { supabase } from "@/lib/supabase";
import type { NextRequest } from "next/server";
import furubiraInfo from "@/scripts/furubira_info.json";

// OpenAI APIのインスタンスを作成
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // 環境変数から取得
});

export async function POST(request: NextRequest) {
  const { content, sessionId } = await request.json();

  if (!content || !sessionId) {
    return Response.json({ error: "ContentとsessionIdは必須です" }, { status: 400 });
  }

  await saveChat({ content, role: "user", sessionId });

  // システムプロンプトを設定
  const furubira_info = JSON.stringify(furubiraInfo);

  // 型を明示的に指定
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: `
        文体を「だよ。」「♪」等を使って、可愛くして。
        出来るだけ最小のアウトプットにして。もし必要であれば最大5文くらいにして。
        以下の情報を参考にしてください: ${furubira_info}
      `
    },
    {
      role: "user",
      content: content
    }
  ];

  try {
    // OpenAI APIにリクエスト
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // モデルの指定（正しいことは確認済み）
      messages: messages as any, // 型の適合を強制
      temperature: 0.7
    });

    const text = response.choices[0]?.message?.content || "";

    // 結果をSupabaseに保存
    await saveChat({ content: text, role: "assistant", sessionId });

    // 文字列として返す
    return new Response(text);
  } catch (error) {
    console.error("OpenAI API エラー:", error);
    return Response.json({ error: "OpenAI API呼び出しでエラーが発生しました" }, { status: 500 });
  }
}

// チャット履歴を保存
async function saveChat(entry: { content: string; role: string; sessionId: string }) {
  const { error } = await supabase.from("chat").insert({
    ...entry,
    timestamp: new Date().toISOString()
  });

  if (error) {
    console.error("Supabaseエラー:", error);
  }
}
