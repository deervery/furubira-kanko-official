"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { ShopType } from "@/lib/types"

export default function ShoppingPage() {
  const renderExtra = (shop: ShopType) => (
    <p className="text-sm text-gray-500">{shop.type}</p>
  )

  return (
    <ItemListClient<ShopType>
      title="買い物"
      tableName="shops"
      renderExtra={renderExtra}
    />
  )
}

