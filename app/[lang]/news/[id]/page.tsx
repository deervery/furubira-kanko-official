import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/ui/header"
import { Footer } from "@/components/ui/footer"
import { isLang } from "@/lib/i18n/lang"
import { getPublicNews } from "@/lib/news-service"
import { newsText } from "@/lib/news"
export const dynamic = "force-dynamic"
export default async function NewsDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!isLang(lang) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) notFound()
  const items = await getPublicNews(id).catch(() => null)
  if (items && !items.length) notFound()
  const item = items?.[0]
  const text = item && newsText(item, lang)
  return <><Header solid /><main className="mx-auto max-w-3xl px-4 pb-16 pt-28 min-h-screen">
    {item && text ? <article lang={text.lang}><time dateTime={item.published_on} className="text-gray-600">{item.published_on}</time><h1 className="text-3xl font-bold my-6 break-words">{text.title}</h1><div className="whitespace-pre-wrap break-words leading-8">{text.body}</div></article> : <p role="alert">{lang === "en" ? "News is temporarily unavailable. Please try again later." : "現在お知らせを取得できません。時間をおいて再度お試しください。"}</p>}
    <Link href={`/${lang}/news`} className="inline-block mt-10 underline">{lang === "en" ? "All news" : "お知らせ一覧へ"}</Link>
  </main><Footer /></>
}
