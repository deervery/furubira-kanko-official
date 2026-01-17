import { OpenAI } from "openai";
import { supabase } from "@/lib/supabase";
import type { NextRequest } from "next/server";

// OpenAI APIのインスタンスを作成
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // 環境変数から取得
});

const TOP_K = 8;
const SIMILARITY_THRESHOLD = 0.75;

type FurubiraInfoMatch = {
  title: string | null;
  content: string | null;
  similarity: number | null;
};

function buildContext(matches: FurubiraInfoMatch[]): string {
  return matches
    .map((m, i) => {
      const title = (m.title ?? "").trim();
      const content = (m.content ?? "").trim();
      const sim = typeof m.similarity === "number" ? m.similarity : null;
      const simText = sim === null ? "n/a" : sim.toFixed(3);
      return `【${i + 1}】similarity=${simText}\nタイトル: ${title}\n本文:\n${content}`;
    })
    .join("\n\n");
}

function streamPlainTextAndSave({
  text,
  sessionId,
}: {
  text: string;
  sessionId: string;
}): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(new TextEncoder().encode(text));
        await saveChat({ content: text, role: "assistant", sessionId });
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(request: NextRequest) {
  const { content, sessionId } = await request.json();

  if (!content || !sessionId) {
    return Response.json({ error: "ContentとsessionIdは必須です" }, { status: 400 });
  }

  await saveChat({ content, role: "user", sessionId });

  // 1) クエリEmbedding生成
  let queryEmbedding: number[] | null = null;
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: content,
    });
    queryEmbedding = embeddingResponse.data[0]?.embedding ?? null;
  } catch (error) {
    console.error("OpenAI Embedding Error:", error);
    const stream = streamPlainTextAndSave({
      text: "申し訳ありません、検索のためのEmbedding生成でエラーが発生しました。",
      sessionId,
    });
    return new Response(stream);
  }

  if (!queryEmbedding) {
    const stream = streamPlainTextAndSave({
      text: "申し訳ありません、検索のためのEmbedding生成に失敗しました。",
      sessionId,
    });
    return new Response(stream);
  }

  // 2) RPCでtopK取得
  let matches: FurubiraInfoMatch[] = [];
  try {
    const { data, error } = await supabase.rpc("match_furubira_info", {
      query_embedding: queryEmbedding,
      match_count: TOP_K,
    });

    if (error) {
      console.error("Supabase RPC Error:", error);
      const stream = streamPlainTextAndSave({
        text: "申し訳ありません、関連情報の検索でエラーが発生しました。",
        sessionId,
      });
      return new Response(stream);
    }

    matches = Array.isArray(data) ? (data as FurubiraInfoMatch[]) : [];
  } catch (error) {
    console.error("Supabase RPC Call Error:", error);
    const stream = streamPlainTextAndSave({
      text: "申し訳ありません、関連情報の検索でエラーが発生しました。",
      sessionId,
    });
    return new Response(stream);
  }

  if (matches.length === 0) {
    const stream = streamPlainTextAndSave({
      text: "古平町の情報からは該当する内容が見つかりませんでした。場所・時期・目的（観光/交通/宿泊/食事など）を教えてもらえると探しやすいよ。",
      sessionId,
    });
    return new Response(stream);
  }

  const top1 = matches[0];
  const top1Sim = typeof top1.similarity === "number" ? top1.similarity : null;
  if (top1Sim !== null && top1Sim < SIMILARITY_THRESHOLD) {
    const stream = streamPlainTextAndSave({
      text: "古平町の情報からは十分に近い根拠が見つかりませんでした。場所・時期・対象（例: 施設名/イベント名/交通手段）をもう少し具体的に教えてください。",
      sessionId,
    });
    return new Response(stream);
  }

  const context = buildContext(matches);

  // 型を明示的に指定
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: `
        ポジティブな文には「♪」、ちょっと残念だったり、申し訳ないときは、「だよ。」「だね。」を使ってください。
        出来るだけ最小のアウトプットにして。もし必要であれば最大5文くらいにして。
        ルール: 以下の「根拠」以外は推測しないでください。根拠に無い場合は不明と伝え、必要なら追加質問をしてください。

        根拠:
        ${context}
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
