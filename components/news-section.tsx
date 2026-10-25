"use client"
import source from "@/content/news.json"
import Link from "@/components/static-link"
import { useI18n } from "@/components/i18n/i18n-provider"
import { newsText, newsCollection } from "@/lib/news"
export function NewsSection() {
  const { lang } = useI18n()
  const items = newsCollection.parse(source)
  if (!items?.length) return null
  return <section className="bg-white px-4 py-12 text-gray-900" aria-labelledby="news-heading">
    <div className="mx-auto max-w-3xl">
      <h2 id="news-heading" className="text-2xl font-bold mb-6">{lang === "en" ? "News" : "お知らせ"}</h2>
      <ul className="divide-y">{items.slice(0, 5).map(item => <li key={item.id} className="py-4">
        <time dateTime={item.published_on} className="text-sm text-gray-600 mr-4">{item.published_on}</time>
        <Link href={`/${lang}/news/${item.id}`} lang={newsText(item, lang).lang} className="underline underline-offset-4">{newsText(item, lang).title}</Link>
      </li>)}</ul>
      <Link className="inline-block mt-6 underline" href={`/${lang}/news`}>{lang === "en" ? "All news" : "お知らせ一覧"}</Link>
    </div>
  </section>
}
