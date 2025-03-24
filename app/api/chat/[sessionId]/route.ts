import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId

  try {
    const { data: messages, error } = await supabase
      .from("chat")
      .select("*")
      .eq("sessionId", sessionId)
      .order("timestamp", { ascending: true })

    if (error) throw error

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch chat messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

