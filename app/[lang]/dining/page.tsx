"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { RestaurantType } from "@/lib/types"
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export default function DiningPage() {
  const { messages } = useI18n()
  return (
    <ItemListClient<RestaurantType>
      title={t(messages, "header.restaurants")}
      tableName="restaurants"
    />
  )
}


