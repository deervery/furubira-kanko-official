import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { supabase } from "@/lib/supabase"
import type { NextRequest } from "next/server"

const SYSTEM_PROMPT_JP = `
  あなたは古平町の観光案内アシスタントです。最後は「♪」で終えてください。
`

export async function POST(request: NextRequest) {
  const { content, sessionId, stream = true } = await request.json()
  if (!content || !sessionId) 
    return Response.json({ error: "ContentとsessionIdは必須です" }, { status: 400 })

  await saveChat({ content, role: "user", sessionId })
  const history = await fetchChatHistory(sessionId)
  const messages = [{ role: "system", content: SYSTEM_PROMPT_JP }, ...history]

  const { data: infos } = await supabase.from("furubira_info").select("title,content,embedding")
  if (infos?.length) await appendRelevantInfo(messages, content, infos)

  const result = streamText({ model: openai("gpt-4o"), messages })
  if (!stream) {
    const text = await result.text
    await saveChat({ content: text, role: "assistant", sessionId })
    return Response.json({ text })
  }
  result.text.then(text => saveChat({ content: text, role: "assistant", sessionId }))
  return result.toTextStreamResponse()
}

async function appendRelevantInfo(messages: any[], query: string, infos: any[]) {
  try {
    const userEmbedding = (await openai.embedding("text-embedding-ada-002").doEmbed({ values: [query] })).embeddings[0]
    let best: { info: { title: string; content: string; embedding: any } | null; sim: number } = { info: null, sim: 0 }

    for (const info of infos) {
      const dbEmbed = typeof info.embedding === "string" ? JSON.parse(info.embedding) : info.embedding
      const sim = cosineSimilarity(userEmbedding, dbEmbed)
      if (sim > best.sim) best = { info, sim }
    }

    if (best.info && best.sim > 0.75) {
      messages.push({ role: "system", content: `【関連情報】\n${best.info.title}\n${best.info.content}` })
    }
  } catch {
    // 無視
  }
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length) return 0
  const dot = a.reduce((s, v, i) => s + v * b[i], 0)
  const norm = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x*x, 0))
  const denom = norm(a) * norm(b)
  return denom ? dot / denom : 0
}

async function saveChat(entry: { content: string; role: string; sessionId: string }) {
  await supabase.from("chat").insert({ ...entry, timestamp: new Date().toISOString() })
}

async function fetchChatHistory(sessionId: string) {
  const { data } = await supabase.from("chat").select("role,content").eq("sessionId", sessionId).order("timestamp")
  return data?.map(({ role, content }) => ({ role, content })) ?? []
}
