"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { SpotType } from "@/lib/types"

export default function SpotsPage() {
  const renderExtra = (spot: SpotType) => (
    <>
      {spot.address && <p className="text-sm text-gray-500">{spot.address}</p>}
      {spot.facilities && <p className="text-sm text-gray-500 mt-2">施設：{spot.facilities}</p>}
    </>
  )

  return (
    <ItemListClient<SpotType>
      title="観光スポット"
      tableName="spots"
      renderExtra={renderExtra}
    />
  )
}

