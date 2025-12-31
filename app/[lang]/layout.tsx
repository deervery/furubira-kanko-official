import type React from "react"
import { notFound } from "next/navigation"

import { I18nProvider } from "@/components/i18n/i18n-provider"
import { getMessages } from "@/lib/i18n/getMessages"
import { isLang, type Lang } from "@/lib/i18n/lang"

export function generateStaticParams(): Array<{ lang: Lang }> {
  return [{ lang: "ja" }, { lang: "en" }]
}

export default function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: { lang: string }
}>) {
  if (!isLang(params.lang)) {
    notFound()
  }

  const messages = getMessages(params.lang)

  return (
    <I18nProvider lang={params.lang} messages={messages}>
      {children}
    </I18nProvider>
  )
}


