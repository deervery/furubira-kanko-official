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
    // ストリーミングレスポンスを作成
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // OpenAI APIにストリーミングリクエスト
          const stream = await openai.chat.completions.create({
            model: "gpt-4o-mini", // モデルの指定
            messages: messages as any, // 型の適合を強制
            temperature: 0.7,
            stream: true, // ストリーミングを有効化
          });

          let fullResponse = "";

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            fullResponse += content;
            
            // ストリーミングで出力
            if (content) {
              controller.enqueue(new TextEncoder().encode(content));
            }
          }

          // 完了したレスポンスをSupabaseに保存
          if (fullResponse) {
            await saveChat({ content: fullResponse, role: "assistant", sessionId });
          }
          
          controller.close();
        } catch (error) {
          console.error("OpenAI ストリーミング エラー:", error);
          
          // エラーの詳細情報をログに出力
          if (error instanceof Error) {
            console.error("エラーメッセージ:", error.message);
            console.error("エラースタック:", error.stack);
            
            if ('status' in error) {
              console.error("ステータスコード:", (error as any).status);
            }
          }
          
          // エラーメッセージをクライアントに送信
          controller.enqueue(new TextEncoder().encode("申し訳ありません、エラーが発生しました。"));
          controller.close();
        }
      },
    });

    // ストリーミングレスポンスを返す
    return new Response(stream);
  } catch (error) {
    console.error("OpenAI API エラー:", error);
    
    // エラーの詳細情報をログに出力
    if (error instanceof Error) {
      console.error("エラーメッセージ:", error.message);
      console.error("エラースタック:", error.stack);
      
      if ('status' in error) {
        console.error("ステータスコード:", (error as any).status);
      }
      
      if ('response' in error) {
        try {
          console.error("レスポンス:", JSON.stringify((error as any).response, null, 2));
        } catch (e) {
          console.error("レスポンスのシリアライズに失敗:", e);
        }
      }
    }
    
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
