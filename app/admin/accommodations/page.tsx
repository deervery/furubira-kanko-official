"use client"

import { ItemsList } from "@/components/admin/item-list"
import { ItemForm } from "@/components/admin/item-form"
import type { AccommodationType } from "@/lib/types"

export default function AccommodationsAdminPage() {
  const FormComponent = ({ item, onClose }: { item: AccommodationType | null, onClose: (refreshData?: boolean) => void }) => (
    <ItemForm<AccommodationType>
      item={item}
      onClose={onClose}
      title="宿泊施設"
      tableName="accommodations"
      defaultIcon="BedDouble"
      storageFolder="accommodations"
    />
  )

  return (
    <ItemsList<AccommodationType>
      title="宿泊施設"
      tableName="accommodations"
      FormComponent={FormComponent}
    />
  )
} 