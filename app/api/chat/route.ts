import { OpenAI } from "openai";
import { getSupabaseClientOrNull, isSupabaseConfigured } from "@/lib/supabase";
import type { NextRequest } from "next/server";

// OpenAI APIのインスタンスを作成
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // 環境変数から取得
});

const TOP_K = 8;
const SIMILARITY_THRESHOLD = 0.4;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-5-nano";
const RAG_JUDGE_MODEL = "gpt-4o-mini";

const KEEPALIVE_INTERVAL_MS = 3000;
const RAG_JUDGE_TIMEOUT_MS = 6000;
const EMBEDDING_TIMEOUT_MS = 8000;
const ANSWER_STREAM_FIRST_BYTE_TIMEOUT_MS = 8000;
const SUPABASE_RPC_TIMEOUT_MS = 8000;
const OVERALL_TIMEOUT_MS = 45000;

// Invisible "start" token to flip the client out of "thinking" without showing text.
// (String.prototype.trim() does NOT remove U+200B in most JS engines.)
const STREAM_START_TOKEN = "\u200B";

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
        try {
          controller.close();
        } catch {
          // ignore if already closed
        }
      }
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`[timeout] ${label} (${ms}ms)`)), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

function startKeepAlive(controller: ReadableStreamDefaultController<Uint8Array>) {
  // Send whitespace periodically so proxies don't consider it idle.
  // (Chat UI ignores whitespace-only chunks until real text arrives.)
  return setInterval(() => {
    try {
      controller.enqueue(new TextEncoder().encode(STREAM_START_TOKEN))
    } catch {
      // ignore if closed
    }
  }, KEEPALIVE_INTERVAL_MS)
}

/**
 * gpt-4o-miniを使って、RAG（データベース検索）が必要かどうかを判断する
 * @param queryNormalized 正規化されたユーザーのクエリ
 * @returns true: RAGが必要, false: RAGが不要（一般的な会話で答えられる）
 */
async function shouldUseRAG(queryNormalized: string): Promise<boolean> {
  try {
    const response = await withTimeout(
      openai.chat.completions.create({
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
      } as any),
      RAG_JUDGE_TIMEOUT_MS,
      "rag-judge",
    );

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
  let content: unknown;
  let sessionId: unknown;
  try {
    const body = await request.json();
    content = (body as any)?.content;
    sessionId = (body as any)?.sessionId;
  } catch (error) {
    console.error("Request JSON parse error:", error);
    // Return 200 stream so the client can display the message (it expects streaming)
    const stream = streamPlainTextAndSave({
      text: "ごめんね、送信内容を読み取れなかったみたい。もう一度送ってみてね♪",
      sessionId: "unknown",
    });
    return new Response(stream);
  }

  if (!content || !sessionId) {
    // Return 200 stream so the client can display the message (it expects streaming)
    const stream = streamPlainTextAndSave({
      text: "ごめんね、メッセージの内容が空っぽみたい。もう一度送ってみてね♪",
      sessionId: String(sessionId ?? "unknown"),
    });
    return new Response(stream);
  }

  const queryRaw = String(content);
  const sessionIdStr = String(sessionId);

  // Return a stream immediately to avoid platform/proxy timeouts (504).
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Send an invisible first chunk quickly so the client can transition from "thinking".
      try {
        controller.enqueue(new TextEncoder().encode(STREAM_START_TOKEN));
      } catch {
        // ignore
      }

      const keepAlive = startKeepAlive(controller)
      const overallTimer = setTimeout(() => {
        try {
          controller.enqueue(
            new TextEncoder().encode(
              "ごめんね、少し時間がかかっているみたい。もう一度送ってみてね♪",
            ),
          )
        } catch {
          // ignore
        }
        try {
          controller.close()
        } catch {
          // ignore
        }
      }, OVERALL_TIMEOUT_MS)

      try {
        // Save user message (best-effort; never fail the request).
        await saveChat({ content: queryRaw, role: "user", sessionId: sessionIdStr })

        const queryNormalized = normalizeText(queryRaw);

        // 0) Safe small-talk short-circuit (no embedding/RPC)
        const smallTalk = pickSmallTalkReply(queryNormalized);
        if (smallTalk) {
          try {
            controller.enqueue(new TextEncoder().encode(smallTalk))
          } catch {}
          await saveChat({ content: smallTalk, role: "assistant", sessionId: sessionIdStr })
          return
        }

        // 0.5) Decide whether to use RAG (timed). On error, default to true (safer).
        const needsRAG = await shouldUseRAG(queryNormalized);

        let matches: FurubiraInfoMatch[] = [];
        let queryEmbedding: number[] | null = null;

        if (needsRAG) {
          if (!isSupabaseConfigured()) {
            console.warn("[rag] Supabase is not configured. Skipping retrieval.");
          } else {
            // 1) Query embedding (timed)
            try {
              const embeddingResponse = await withTimeout(
                openai.embeddings.create({
                  model: "text-embedding-3-small",
                  input: queryNormalized,
                } as any),
                EMBEDDING_TIMEOUT_MS,
                "embedding",
              );
              queryEmbedding = embeddingResponse.data[0]?.embedding ?? null;
            } catch (error) {
              console.error("OpenAI Embedding Error:", error);
              const msg = "ごめんね、ちょっと調子が悪いみたい。もう一度聞いてもらえると嬉しいな♪"
              try {
                controller.enqueue(new TextEncoder().encode(msg))
              } catch {}
              await saveChat({ content: msg, role: "assistant", sessionId: sessionIdStr })
              return
            }

            if (!queryEmbedding) {
              const msg = "ごめんね、うまく聞き取れなかったみたい。もう一度教えてくれる？"
              try {
                controller.enqueue(new TextEncoder().encode(msg))
              } catch {}
              await saveChat({ content: msg, role: "assistant", sessionId: sessionIdStr })
              return
            }

            // 2) RPC topK
            try {
              const sb = getSupabaseClientOrNull();
              if (!sb) throw new Error("[supabase] not configured");

              const rpcResult = await withTimeout(
                sb.rpc("match_furubira_info", {
                  query_embedding: queryEmbedding,
                  match_count: TOP_K,
                }) as unknown as Promise<{ data: unknown; error: any }>,
                SUPABASE_RPC_TIMEOUT_MS,
                "supabase-rpc",
              );

              const { data, error } = rpcResult;

              if (error) throw error;

              matches = Array.isArray(data) ? (data as FurubiraInfoMatch[]) : [];
            } catch (error) {
              console.error("Supabase RPC Error:", error);
              const msg = "ごめんね、ちょっと調子が悪いみたい。少し待ってからもう一度聞いてね♪"
              try {
                controller.enqueue(new TextEncoder().encode(msg))
              } catch {}
              await saveChat({ content: msg, role: "assistant", sessionId: sessionIdStr })
              return
            }

            if (matches.length === 0) {
              const msg =
                "うーん、ちょっとわからないな。場所や時期、何をしたいか（観光・食事・宿泊など）を教えてくれると、もっと調べやすくなるよ♪"
              try {
                controller.enqueue(new TextEncoder().encode(msg))
              } catch {}
              await saveChat({ content: msg, role: "assistant", sessionId: sessionIdStr })
              return
            }
          }
        }

        const top1 = matches.length > 0 ? matches[0] : null;
        const top1Sim = typeof top1?.similarity === "number" ? top1.similarity : null;
        const hasRelevantContext = needsRAG && top1Sim !== null && top1Sim >= SIMILARITY_THRESHOLD;

        console.info("[rag] retrieval", {
          sessionId: sessionIdStr,
          queryRaw,
          queryNormalized,
          needsRAG,
          matchCount: matches.length,
          top1Similarity: top1Sim,
          selectedHashes: matches.slice(0, 3).map((m) => m.content_hash),
          hasRelevantContext,
        });

        const context = hasRelevantContext ? buildContext(matches) : "";

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
          { role: "user", content: queryRaw },
        ];

        // Try to start OpenAI streaming; if we can't get first bytes in time, fail fast with a friendly message.
        let openAiStream: any
        try {
          openAiStream = await withTimeout(
            openai.responses.create({
              model: CHAT_MODEL,
              input: messages,
              stream: true,
            } as any),
            ANSWER_STREAM_FIRST_BYTE_TIMEOUT_MS,
            "answer-stream-start",
          )
        } catch (error) {
          console.error("OpenAI stream start error:", error)
          const msg = "ごめんね、いま少し混み合っているみたい。もう一度聞いてみてね♪"
          try {
            controller.enqueue(new TextEncoder().encode(msg))
          } catch {}
          await saveChat({ content: msg, role: "assistant", sessionId: sessionIdStr })
          return
        }

        let fullResponse = "";
        for await (const chunk of openAiStream) {
          const type = (chunk as any)?.type;
          const delta = type === "response.output_text.delta" ? String((chunk as any)?.delta ?? "") : "";
          if (!delta) continue;
          fullResponse += delta;
          try {
            controller.enqueue(new TextEncoder().encode(delta));
          } catch {
            // client disconnected
            break;
          }
        }

        if (fullResponse) {
          await saveChat({ content: fullResponse, role: "assistant", sessionId: sessionIdStr });
        }

        console.info("[rag] answer", {
          sessionId: sessionIdStr,
          top1Similarity: top1Sim,
          selectedHashes: matches.slice(0, 3).map((m) => m.content_hash),
          finalAnswer: fullResponse,
        });
      } catch (error) {
        console.error("Chat route stream error:", error)
        const msg = "ごめんね、途中でうまくいかなくなっちゃった。もう一度聞いてみてね♪"
        try {
          controller.enqueue(new TextEncoder().encode(msg))
        } catch {}
        await saveChat({ content: msg, role: "assistant", sessionId: sessionIdStr })
      } finally {
        clearInterval(keepAlive)
        clearTimeout(overallTimer)
        try {
          controller.close()
        } catch {
          // ignore
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

// チャット履歴を保存
async function saveChat(entry: { content: string; role: string; sessionId: string }) {
  try {
    const sb = getSupabaseClientOrNull();
    if (!sb) return;

    const { error } = await sb.from("chat").insert({
      ...entry,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error("Supabaseエラー:", error);
    }
  } catch (error) {
    console.error("Supabase saveChat exception:", error);
  }
}
