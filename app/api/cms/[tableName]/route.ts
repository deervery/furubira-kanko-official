import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseClientOrNull } from "@/lib/supabase";

const ALLOWED_TABLES = new Set([
  "spots",
  "restaurants",
  "accommodations",
  "events",
  "shops",
]);

// Vercel Edge/CDN にキャッシュさせる（1時間キャッシュ、24時間 stale-while-revalidate）
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tableName: string }> }
) {
  const { tableName } = await context.params;

  if (!ALLOWED_TABLES.has(tableName)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const sb = getSupabaseClientOrNull();
  if (!sb) {
    return NextResponse.json([], {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  const { data, error } = await sb
    .from(tableName)
    .select("id,name,name_en,description,description_en,address,facilities,facilities_en,date,date_en,type,image_path,icon,url,display_order")
    .order("display_order", { ascending: true });

  if (error) {
    console.error(`CMS fetch error (${tableName}):`, error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
