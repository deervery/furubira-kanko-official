"use client"

import { createContext, useContext } from "react"
import type { Lang } from "@/lib/i18n/lang"
import type { Messages } from "@/lib/i18n/messages"

type I18nContextValue = {
  lang: Lang
  messages: Messages
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({
  lang,
  messages,
  children,
}: {
  lang: Lang
  messages: Messages
  children: React.ReactNode
}) {
  return <I18nContext.Provider value={{ lang, messages }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const v = useContext(I18nContext)
  if (!v) {
    throw new Error("useI18n must be used within <I18nProvider>")
  }
  return v
}


