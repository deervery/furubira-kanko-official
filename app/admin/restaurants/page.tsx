"use client"

import { ItemsList } from "@/components/admin/item-list"
import { ItemForm } from "@/components/admin/item-form"
import type { RestaurantType } from "@/lib/types"

export default function RestaurantsAdminPage() {
  const FormComponent = ({ item, onClose }: { item: RestaurantType | null, onClose: (refreshData?: boolean) => void }) => (
    <ItemForm<RestaurantType>
      item={item}
      onClose={onClose}
      title="飲食店"
      tableName="restaurants"
      defaultIcon="Utensils"
      storageFolder="restaurants"
    />
  )

  return (
    <ItemsList<RestaurantType>
      title="飲食店"
      tableName="restaurants"
      FormComponent={FormComponent}
    />
  )
} 