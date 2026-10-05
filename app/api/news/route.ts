import { NextResponse } from "next/server"
import { getPublicNews } from "@/lib/news-service"
export async function GET() {
  return NextResponse.json(await getPublicNews(), { headers: { "Cache-Control": "no-store" } })
}
