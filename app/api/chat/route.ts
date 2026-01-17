import { OpenAI } from "openai";
import { supabase } from "@/lib/supabase";
import type { NextRequest } from "next/server";

// OpenAI APIのインスタンスを作成
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // 環境変数から取得
});

const TOP_K = 8;
const SIMILARITY_THRESHOLD = 0.4;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-5-nano";
const RAG_JUDGE_MODEL = "gpt-4o-mini";

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

function pickSmallTalkReply(queryNormalized: string): string | null {
  const q = queryNormalized.trim();
  if (!q) return "ごめんね、もう一度送ってくれる？";

  // RAG前に安全に返せる短文はここで処理（Embedding/RPCを呼ばない）
  const isShort = q.length <= 40;
  // NOTE: `\b` は日本語だと単語境界にならずマッチしないことがあるので使わない
  const greetingPattern =
    /^(こんにちは|こんばんは|おはよう|やあ|はじめまして|よろしく(ね|お願いします)?|おつかれ|お疲れ|hi|hello|hey)(\s|!|！|。|\.|$)/i;
  const thanksPattern =
    /^(ありがとう|ありがと|thanks|thx)(\s|!|！|。|\.|$)/i;
  const howAreYouPattern =
    /^(元気|お元気|調子どう|調子どう\?|how are you)(\s|!|！|。|\.|\?|？|$)/i;

  if (isShort && greetingPattern.test(q)) {
    return "こんにちは♪ 今日はどんなことを知りたい？（観光・食事・宿泊などでもOKだよ）";
  }
  if (isShort && thanksPattern.test(q)) {
    return "どういたしまして♪ ほかにも気になることがあれば気軽に聞いてね";
  }
  if (isShort && howAreYouPattern.test(q)) {
    return "元気だよ♪ ありがとう。今日は何を一緒に調べようか？";
  }
  return null;
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

/**
 * gpt-4o-miniを使って、RAG（データベース検索）が必要かどうかを判断する
 * @param queryNormalized 正規化されたユーザーのクエリ
 * @returns true: RAGが必要, false: RAGが不要（一般的な会話で答えられる）
 */
async function shouldUseRAG(queryNormalized: string): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: RAG_JUDGE_MODEL,
      messages: [
        {
          role: "system",
          content: `あなたは古平町の観光案内AIアシスタントです。ユーザーの質問を読んで、古平町の具体的な情報（観光スポット、店舗、イベント、宿泊施設など）を検索する必要があるかどうかを判断してください。

            判断基準:
            - YES: 古平町の具体的な情報（場所名、店名、イベント名、営業時間、料金、住所など）が必要な質問
            - NO: 一般的な挨拶、雑談、一般的な知識で答えられる質問、または古平町の情報が不要な質問

            回答は必ず「YES」または「NO」の1語のみで答えてください。`,
        },
        {
          role: "user",
          content: queryNormalized,
        },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const answer = response.choices[0]?.message?.content?.trim().toUpperCase() || "";
    const needsRAG = answer === "YES" || answer.startsWith("YES");
    
    console.info("[rag-judge]", {
      query: queryNormalized,
      answer,
      needsRAG,
    });

    return needsRAG;
  } catch (error) {
    console.error("RAG判断エラー:", error);
    // エラー時は安全のためRAGを実行する
    return true;
  }
}

export async function POST(request: NextRequest) {
  const { content, sessionId } = await request.json();

  if (!content || !sessionId) {
    return Response.json({ error: "ContentとsessionIdは必須です" }, { status: 400 });
  }

  await saveChat({ content, role: "user", sessionId });

  const queryRaw = String(content);
  const queryNormalized = normalizeText(queryRaw);

  // 0) RAGの前段で、安全に返せる短い挨拶/雑談は即返答（Embedding/RPCを呼ばない）
  const smallTalk = pickSmallTalkReply(queryNormalized);
  if (smallTalk) {
    const stream = streamPlainTextAndSave({ text: smallTalk, sessionId });
    return new Response(stream);
  }

  // 0.5) gpt-4o-miniでRAGが必要かどうかを判断（超小さいコンテキスト）
  const needsRAG = await shouldUseRAG(queryNormalized);

  let matches: FurubiraInfoMatch[] = [];
  let queryEmbedding: number[] | null = null;

  if (needsRAG) {
    // 1) クエリEmbedding生成
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
  }

  const top1 = matches.length > 0 ? matches[0] : null;
  const top1Sim = typeof top1?.similarity === "number" ? top1.similarity : null;
  const hasRelevantContext = needsRAG && top1Sim !== null && top1Sim >= SIMILARITY_THRESHOLD;

  console.info("[rag] retrieval", {
    sessionId,
    queryRaw,
    queryNormalized,
    needsRAG,
    matchCount: matches.length,
    top1Similarity: top1Sim,
    selectedHashes: matches.slice(0, 3).map((m) => m.content_hash),
    hasRelevantContext,
  });

  const context = hasRelevantContext ? buildContext(matches) : "";

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
        ${needsRAG ? `- 「根拠」があるときは、根拠に書いてある情報を優先して答えてね
        - 「根拠」が空っぽ/関連が弱いときは、古平町に固有の事実（店名・住所・営業時間・イベント日程など）を推測で断定しないでね
        - 古平町の個別情報が必要そうなら「ごめんね、ちょっとわからないな」と正直に言って、追加の条件を聞いてね（場所/時期/目的など）

        根拠:
        ${context}` : `- 一般的な会話や質問に、親しみやすく答えてね
        - 古平町の具体的な情報（店名・住所・営業時間など）については、確実な情報がない場合は推測で断定しないでね
        - わからないときは正直に「ごめんね、ちょっとわからないな」と伝えてね`}
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
          // OpenAI APIにストリーミングリクエスト（gpt-5-nano は Responses API を利用）
          const stream = await openai.responses.create({
            model: CHAT_MODEL,
            input: messages,
            stream: true,
          });

          let fullResponse = "";

          for await (const chunk of stream) {
            // Responses API のストリームイベントからテキストdeltaを拾う
            const type = (chunk as any)?.type;
            const delta =
              type === "response.output_text.delta"
                ? String((chunk as any)?.delta ?? "")
                : "";

            if (delta) {
              fullResponse += delta;
              controller.enqueue(new TextEncoder().encode(delta));
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
