import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supabase } from "@/lib/supabase"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Request received")
    const body = await request.json()
    const { content, sessionId, stream } = body
    const useStream = stream !== false

    if (!content || !sessionId) {
      console.error("Missing content or sessionId")
      return Response.json({ error: "Content and sessionId are required" }, { status: 400 })
    }

    console.log("Fetching system message")
    // Get system message from Supabase
    const { data: systemMessageData } = await supabase.from("system_message").select("message").single()

    // 基本のシステムメッセージに2行制限の指示を追加
    const baseSystemMessage =
      systemMessageData?.message ||
      "I am a friendly, flexible, and humorous assistant for sightseeing guidance in 古平町. Use friendly Japanese sentence endings such as 「なんだ。」, 「だよ。」, and 「するのはどうかな？」. Always end your final sentence with 「♪」. For your info, 道の駅 is sightseeing-spot For malicious queries, calmly reply with 「古平町や観光情報について質問してね。」. Don't ask user.";
    const systemMessage = `${baseSystemMessage} `

    console.log("Saving user message")
    // Save user message to Supabase
    await supabase.from("chat").insert({
      content,
      role: "user",
      sessionId,
      timestamp: new Date().toISOString(),
    })

    console.log("Fetching chat history")
    // Get chat history for context
    const { data: chatHistory } = await supabase
      .from("chat")
      .select("*")
      .eq("sessionId", sessionId)
      .order("timestamp", { ascending: true })

    // Format messages for OpenAI
    const messages = [
      { role: "system", content: systemMessage },
      ...(chatHistory || []).map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    console.log("Retrieving additional information")
    // Retrieve additional information from furubira_info
    const furubiraInfo = await getFurubiraInfo()

    if (furubiraInfo && furubiraInfo.length > 0) {
      try {
        // OpenAI providerのembeddingメソッドを使用してエンベディングを生成
        const embeddingModel = openai.embedding("text-embedding-ada-002");
        const embeddingResult = await embeddingModel.doEmbed({ values: [content] });
        const userEmbedding = embeddingResult.embeddings[0];

        // 類似度計算時に、info.embedding が文字列の場合はパースする
        const relevantInfo = furubiraInfo.reduce<{ info: any; similarity: number }>(
          (bestMatch, info) => {
            const embeddingFromDB = typeof info.embedding === "string" ? JSON.parse(info.embedding) : info.embedding
            const similarity = calculateSimilarity(userEmbedding, embeddingFromDB)

            if (similarity > bestMatch.similarity) {
              return { info, similarity }
            }
            return bestMatch
          },
          { info: null, similarity: Number.NEGATIVE_INFINITY },
        )

        if (relevantInfo.info && relevantInfo.similarity > 0.7) {
          console.log(
            `Found relevant information: ${relevantInfo.info.title} (similarity: ${relevantInfo.similarity.toFixed(2)})`,
          )
          messages.push({
            role: "system",
            content: `relevant information found：
            title: ${relevantInfo.info.title}
            content: ${relevantInfo.info.content}`,
          })
        } else {
          console.log("No highly relevant information found")
        }
      } catch (embeddingError) {
        console.error("Error generating embeddings:", embeddingError)
        // エンベディングエラーがあっても処理を続行
      }
    }

    console.log("Generating response")
    // ストリーミングレスポンスを生成
    const result = streamText({
      model: openai("gpt-4o"),
      messages,
    })

    if (!useStream) {
      // 非ストリーミングモード: 完全なテキストを待ってから返す
      const fullText = await result.text
      console.log("Saving assistant response")
      await supabase.from("chat").insert({
        content: fullText,
        role: "assistant",
        sessionId,
        timestamp: new Date().toISOString(),
      })
      return Response.json({ text: fullText })
    } else {
      // ストリーミングモード: レスポンスを即座に返し、完了後にDBに保存
      result.text
        .then(async (fullText) => {
          console.log("Saving assistant response")
          await supabase.from("chat").insert({
            content: fullText,
            role: "assistant",
            sessionId,
            timestamp: new Date().toISOString(),
          })
        })
        .catch((error) => {
          console.error("Error saving assistant response:", error)
        })

      // ストリーミングレスポンスを返す
      return result.toTextStreamResponse()
    }
  } catch (error) {
    console.error("Chat API Error:", error)
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

async function getFurubiraInfo() {
  try {
    const { data, error } = await supabase.from("furubira_info").select("title, content, embedding")

    if (error) throw error
    return data
  } catch (error) {
    console.error("Error fetching furubira_info:", error)
    return null
  }
}

function calculateSimilarity(embedding1: number[], embedding2: number[]): number {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    console.error("Invalid embeddings for similarity calculation")
    return -1
  }

  const dotProduct = embedding1.reduce((sum, value, index) => sum + value * embedding2[index], 0)
  const magnitude1 = Math.sqrt(embedding1.reduce((sum, value) => sum + value * value, 0))
  const magnitude2 = Math.sqrt(embedding2.reduce((sum, value) => sum + value * value, 0))

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0
  }

  return dotProduct / (magnitude1 * magnitude2)
}

