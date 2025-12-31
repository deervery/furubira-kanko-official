import type React from "react"
import { notFound } from "next/navigation"

import { I18nProvider } from "@/components/i18n/i18n-provider"
import { getMessages } from "@/lib/i18n/getMessages"
import { isLang, type Lang } from "@/lib/i18n/lang"

export function generateStaticParams(): Array<{ lang: Lang }> {
  return [{ lang: "ja" }, { lang: "en" }]
}

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  // Next.js 16: params can be a Promise in some cases (especially with streaming).
  // Accept both shapes to be robust.
  params: { lang: string } | Promise<{ lang: string }>
}>) {
  const { lang } = await Promise.resolve(params)

  if (!isLang(lang)) {
    notFound()
  }

  const messages = getMessages(lang)

  return (
    <I18nProvider lang={lang} messages={messages}>
      {children}
    </I18nProvider>
  )
}


