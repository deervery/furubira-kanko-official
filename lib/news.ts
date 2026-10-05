import { z } from "zod"

export const newsInput = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "IDは半角英小文字・数字・ハイフンで入力してください").max(100),
  title: z.string().trim().min(1, "タイトルを入力してください").max(200),
  body: z.string().trim().min(1, "本文を入力してください").max(20000),
  title_en: z.string().trim().max(200).default(""),
  body_en: z.string().trim().max(20000).default(""),
  published_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, "日付を確認してください"),
}).strict().refine(value => Boolean(value.title_en) === Boolean(value.body_en), {
  message: "英語はタイトルと本文を両方入力してください", path: ["title_en"],
})
export const newsCollection = z.array(newsInput).max(1000).refine(items => new Set(items.map(item => item.id)).size === items.length, "IDが重複しています")
export type NewsInput = z.infer<typeof newsInput>
export type NewsItem = NewsInput
export function newsText(item: NewsInput, lang: string) {
  const translated = lang === "en" && Boolean(item.title_en && item.body_en)
  return { title: translated ? item.title_en : item.title, body: translated ? item.body_en : item.body, lang: translated ? "en" : "ja" }
}
export function sortNews(items: NewsItem[]) {
  return [...items].sort((a, b) => b.published_on.localeCompare(a.published_on) || a.id.localeCompare(b.id))
}
export function upsertNews(items: NewsItem[], input: unknown, previousId?: string): NewsItem[] {
  const item = newsInput.parse(input)
  if (items.some(existing => existing.id === item.id && existing.id !== previousId)) throw new Error("IDが重複しています")
  return sortNews(newsCollection.parse([...items.filter(existing => existing.id !== previousId), item]))
}
