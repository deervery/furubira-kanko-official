import { NextResponse } from "next/server"
import { getPublicNews } from "@/lib/news-service"
export const dynamic = "force-dynamic"
export async function GET() {
  try {
    return NextResponse.json(await getPublicNews(), { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "News is temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
