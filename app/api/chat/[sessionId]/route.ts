import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;

  try {
    const { data: messages, error } = await supabase
      .from("chat")
      .select("role,content")
      .eq("sessionId", sessionId)
      .order("timestamp");

    if (error) {
      return Response.json({ error: "データの取得に失敗しました" }, { status: 500 });
    }

    return Response.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

