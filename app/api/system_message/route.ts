import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    const { data, error } = await supabase.from("system_message").select("*").single()

    if (error) throw error

    return NextResponse.json({ message: data.message })
  } catch (error) {
    console.error("Failed to fetch system message", error)
    return NextResponse.json({ error: "システムメッセージの取得に失敗しました" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "無効なメッセージです" }, { status: 400 })
    }

    const { data, error } = await supabase.from("system_message").update({ message }).eq("id", 1).select().single()

    if (error) throw error

    return NextResponse.json({
      message: "システムメッセージが更新されました",
      data,
    })
  } catch (error) {
    console.error("System Message Update Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新に失敗しました" }, { status: 500 })
  }
}

