import { OpenAI } from "openai";
import { supabase } from "@/lib/supabase";
import type { NextRequest } from "next/server";

// OpenAI APIのインスタンスを作成
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // 環境変数から取得
});

const TOP_K = 8;
const SIMILARITY_THRESHOLD = 0.4;

type FurubiraInfoMatch = {
  content_hash?: string | null;
  title: string | null;
  content: string | null;
  similarity: number | null;
};

function normalizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  let s = input.normalize("NFKC");
  // normalize newlines
  s = s.replace(/\r\n?/g, "\n");
  // remove zero-width spaces
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // normalize spaces
  s = s.replace(/[\u00A0\u3000]/g, " ");
  // trim trailing spaces before newline (markdown "  \n" becomes "\n")
  s = s.replace(/[ \t]+\n/g, "\n");
  // collapse excessive horizontal whitespace (keep newlines)
  s = s.replace(/[ \t]{2,}/g, " ");
  // collapse too many blank lines
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function buildContext(matches: FurubiraInfoMatch[]): string {
  return matches
    .map((m, i) => {
      const contentHash = (m.content_hash ?? "").trim();
      const title = (m.title ?? "").trim();
      const content = (m.content ?? "").trim();
      const sim = typeof m.similarity === "number" ? m.similarity : null;
      const simText = sim === null ? "n/a" : sim.toFixed(3);
      return `【${i + 1}】similarity=${simText}\n識別子: ${contentHash}\nタイトル: ${title}\n本文:\n${content}`;
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

  const queryRaw = String(content);
  const queryNormalized = normalizeText(queryRaw);

  // 1) クエリEmbedding生成
  let queryEmbedding: number[] | null = null;
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: queryNormalized,
    });
    queryEmbedding = embeddingResponse.data[0]?.embedding ?? null;
  } catch (error) {
    console.error("OpenAI Embedding Error:", error);
    const stream = streamPlainTextAndSave({
      text: "ごめんね、ちょっと調子が悪いみたい。もう一度聞いてもらえると嬉しいな♪",
      sessionId,
    });
    return new Response(stream);
  }

  if (!queryEmbedding) {
    const stream = streamPlainTextAndSave({
      text: "ごめんね、うまく聞き取れなかったみたい。もう一度教えてくれる？",
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
        text: "ごめんね、ちょっと調子が悪いみたい。少し待ってからもう一度聞いてね♪",
        sessionId,
      });
      return new Response(stream);
    }

    matches = Array.isArray(data) ? (data as FurubiraInfoMatch[]) : [];
  } catch (error) {
    console.error("Supabase RPC Call Error:", error);
    const stream = streamPlainTextAndSave({
      text: "ごめんね、ちょっと調子が悪いみたい。少し待ってからもう一度聞いてね♪",
      sessionId,
    });
    return new Response(stream);
  }

  if (matches.length === 0) {
    const stream = streamPlainTextAndSave({
      text: "うーん、ちょっとわからないな。場所や時期、何をしたいか（観光・食事・宿泊など）を教えてくれると、もっと調べやすくなるよ♪",
      sessionId,
    });
    return new Response(stream);
  }

  const top1 = matches[0];
  const top1Sim = typeof top1?.similarity === "number" ? top1.similarity : null;
  const hasRelevantContext = top1Sim !== null && top1Sim >= SIMILARITY_THRESHOLD;

  console.info("[rag] retrieval", {
    sessionId,
    queryRaw,
    queryNormalized,
    matchCount: matches.length,
    top1Similarity: top1Sim,
    selectedHashes: matches.slice(0, 3).map((m) => m.content_hash),
  });

  const context = buildContext(matches);

  // 型を明示的に指定
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: `
        あなたは古平町の観光案内をする、親しみやすくてやさしいAIアシスタントです。

        話し方のルール:
        - やさしく、あたたかい口調で話してね
        - 嬉しいときや楽しい話題には「♪」をつけてね
        - ちょっと残念なときや申し訳ないときは「〜だよ。」「〜だね。」を使ってね
        - 敬語すぎず、フレンドリーな感じで話してね
        - できるだけ短く、わかりやすく伝えてね（最大5文くらい）

        大事なルール:
        - 以下の「根拠」に書いてある情報だけを使って答えてね
        - 根拠にない情報は推測しないでね
        - わからないときは正直に「ごめんね、ちょっとわからないな」と伝えて、何を知りたいか聞いてね

        根拠:
        ${context}
      `
    },
    {
      role: "user",
      content: queryRaw
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

          console.info("[rag] answer", {
            sessionId,
            top1Similarity: top1Sim,
            selectedHashes: matches.slice(0, 3).map((m) => m.content_hash),
            finalAnswer: fullResponse,
          });
          
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
          controller.enqueue(new TextEncoder().encode("ごめんね、途中でうまくいかなくなっちゃった。もう一度聞いてみてね♪"));
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
