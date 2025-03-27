"use client"

import { useState } from "react"
import { ItemsList } from "@/components/admin/item-list"
import { ItemForm } from "@/components/admin/item-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableCell } from "@/components/ui/table"
import type { ShopType } from "@/lib/types"

export default function ShopsAdminPage() {
  const renderExtraColumns = (shop: ShopType) => (
    <TableCell>{shop.type || "-"}</TableCell>
  )

  const renderExtraFields = ({ item, register }: { 
    item: ShopType | null,
    register: (value: string, setter: (value: string) => void) => any
  }) => {
    const [type, setType] = useState(item?.type || "")

    return (
      <div className="space-y-2">
        <Label htmlFor="type">種類 *</Label>
        <Input
          id="type"
          {...register(type, setType)}
          placeholder="例: 特産品店、菓子店、直売所"
          required
        />
      </div>
    )
  }

  const FormComponent = ({ item, onClose }: { item: ShopType | null, onClose: (refreshData?: boolean) => void }) => (
    <ItemForm<ShopType>
      item={item}
      onClose={onClose}
      title="買い物スポット"
      tableName="shops"
      defaultIcon="ShoppingBag"
      storageFolder="shops"
      renderExtraFields={renderExtraFields}
    />
  )

  return (
    <ItemsList<ShopType>
      title="買い物"
      tableName="shops"
      FormComponent={FormComponent}
      renderExtraColumns={renderExtraColumns}
    />
  )
} 