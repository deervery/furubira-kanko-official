"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { ShopType } from "@/lib/types"
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export default function ShoppingPage() {
  const { messages } = useI18n()
  const renderExtra = (shop: ShopType) => (
    <p className="text-sm text-gray-500">
      {t(messages, "labels.type")}: {shop.type}
    </p>
  )

  return (
    <ItemListClient<ShopType>
      title={t(messages, "header.shopping")}
      tableName="shops"
      renderExtra={renderExtra}
    />
  )
}


