import { createClient } from "@supabase/supabase-js"
import type { NewsItem } from "./news"

// A fresh anonymous client prevents an editor's session from reaching public reads.
export async function getPublicNews(id?: string): Promise<NewsItem[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("News backend is not configured")
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  })
  let query = client.from("news").select("id,title,body,title_en,body_en,published_on,is_published,updated_at")
    .eq("is_published", true).order("published_on", { ascending: false }).order("id", { ascending: false })
  if (id) query = query.eq("id", id)
  const { data, error } = await query.limit(id ? 1 : 100)
  if (error) throw new Error("News could not be loaded")
  return data as NewsItem[]
}
