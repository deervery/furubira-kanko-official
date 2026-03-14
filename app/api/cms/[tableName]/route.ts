import { type NextRequest, NextResponse } from "next/server";
import {
  spotsData,
  restaurantsData,
  accommodationsData,
  eventsData,
  shopsData,
} from "@/lib/hardcoded-data";

const ALLOWED_TABLES: Record<string, readonly any[]> = {
  spots: spotsData,
  restaurants: restaurantsData,
  accommodations: accommodationsData,
  events: eventsData,
  shops: shopsData,
};

// Vercel Edge/CDN にキャッシュさせる（1時間キャッシュ、24時間 stale-while-revalidate）
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tableName: string }> }
) {
  const { tableName } = await context.params;

  const data = ALLOWED_TABLES[tableName];
  if (!data) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  // Sort by display_order ascending (matching previous Supabase query)
  const sorted = [...data].sort(
    (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  return NextResponse.json(sorted, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
