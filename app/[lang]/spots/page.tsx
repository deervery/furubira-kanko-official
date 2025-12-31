"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { SpotType } from "@/lib/types"
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

export default function SpotsPage() {
  const { lang, messages } = useI18n()
  const renderExtra = (spot: SpotType) => (
    <>
      {spot.address && <p className="text-sm text-gray-500">{spot.address}</p>}
      {(lang === "en" ? spot.facilities_en : spot.facilities) && (
        <p className="text-sm text-gray-500 mt-2">
          {t(messages, "labels.facilities")}：
          {lang === "en" ? (spot.facilities_en ?? spot.facilities) : spot.facilities}
        </p>
      )}
    </>
  )

  return (
    <ItemListClient<SpotType>
      title={t(messages, "header.tourist_spot")}
      tableName="spots"
      renderExtra={renderExtra}
    />
  )
}


