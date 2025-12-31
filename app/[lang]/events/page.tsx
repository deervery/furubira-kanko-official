"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { EventType } from "@/lib/types"
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export default function EventsPage() {
  const { lang, messages } = useI18n()
  const renderExtra = (event: EventType) => (
    <p className="text-sm text-gray-500">{lang === "en" ? (event.date_en ?? event.date) : event.date}</p>
  )

  return (
    <ItemListClient<EventType>
      title={t(messages, "header.events")}
      tableName="events"
      renderExtra={renderExtra}
    />
  )
}


