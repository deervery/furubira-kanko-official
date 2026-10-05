import { z } from "zod"

export const newsInput = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください").max(200),
  body: z.string().trim().min(1, "本文を入力してください").max(20000),
  title_en: z.string().trim().max(200).default(""),
  body_en: z.string().trim().max(20000).default(""),
  published_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, "日付を確認してください"),
  is_published: z.boolean(),
}).refine(value => Boolean(value.title_en) === Boolean(value.body_en), {
  message: "英語はタイトルと本文を両方入力してください", path: ["title_en"],
})

export type NewsInput = z.infer<typeof newsInput>
export type NewsItem = NewsInput & { id: string; updated_at: string }
export function canEditNews(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  return user?.app_metadata?.news_editor === true
}
export function newsText(item: NewsInput, lang: string) {
  const translated = lang === "en" && Boolean(item.title_en && item.body_en)
  return { title: translated ? item.title_en : item.title, body: translated ? item.body_en : item.body, lang: translated ? "en" : "ja" }
}
