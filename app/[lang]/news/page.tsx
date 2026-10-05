import Link from "next/link"
import { notFound } from "next/navigation"
import { Header } from "@/components/ui/header"
import { Footer } from "@/components/ui/footer"
import { isLang } from "@/lib/i18n/lang"
import { getPublicNews } from "@/lib/news-service"
import { newsText } from "@/lib/news"
export const dynamic = "force-dynamic"
export default async function NewsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const items = await getPublicNews().catch(() => null)
  return <><Header solid /><main className="mx-auto max-w-3xl px-4 pb-16 pt-28 min-h-screen">
    <h1 className="text-3xl font-bold mb-8">{lang === "en" ? "News" : "お知らせ"}</h1>
    {!items ? <p role="alert">{lang === "en" ? "News is temporarily unavailable. Please try again later." : "現在お知らせを取得できません。時間をおいて再度お試しください。"}</p> : items.length === 0 ? <p>{lang === "en" ? "No news yet." : "現在お知らせはありません。"}</p> : <ul className="divide-y">{items.map(item => <li key={item.id} className="py-5"><time dateTime={item.published_on} className="block text-gray-600 text-sm">{item.published_on}</time><Link lang={newsText(item, lang).lang} className="underline text-lg" href={`/${lang}/news/${item.id}`}>{newsText(item, lang).title}</Link></li>)}</ul>}
    <Link href={`/${lang}`} className="inline-block mt-10 underline">{lang === "en" ? "Home" : "ホームへ"}</Link>
  </main><Footer /></>
}
