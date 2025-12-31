import { messages, type Messages } from "@/lib/i18n/messages"
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/lang"

export function getMessages(lang: Lang): Messages {
  return (messages as any)[lang] ?? (messages as any)[DEFAULT_LANG]
}

