"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { AccommodationType } from "@/lib/types"
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export default function AccommodationsPage() {
  const { messages } = useI18n()
  return (
    <ItemListClient<AccommodationType>
      title={t(messages, "header.accommodations")}
      tableName="accommodations"
    />
  )
}


