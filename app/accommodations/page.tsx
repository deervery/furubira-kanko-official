"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { AccommodationType } from "@/lib/types"

export default function AccommodationsPage() {
  return (
    <ItemListClient<AccommodationType>
      title="宿泊施設"
      tableName="accommodations"
    />
  )
}

