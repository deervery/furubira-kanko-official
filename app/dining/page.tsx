"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { RestaurantType } from "@/lib/types"

export default function DiningPage() {
  return (
    <ItemListClient<RestaurantType>
      title="飲食店"
      tableName="restaurants"
    />
  )
}

