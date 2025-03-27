"use client"

import { useState } from "react"
import { ItemsList } from "@/components/admin/item-list"
import { ItemForm } from "@/components/admin/item-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableCell } from "@/components/ui/table"
import type { TourCategoryType } from "@/lib/types"

export default function TourCategoriesAdminPage() {
  const renderExtraColumns = (category: TourCategoryType) => (
    <>
      <TableCell>{category.key}</TableCell>
    </>
  )

  const renderExtraFields = ({ item, register }: { 
    item: TourCategoryType | null,
    register: (value: string, setter: (value: string) => void) => any
  }) => {
    const [key, setKey] = useState(item?.key || "")
    const [name, setName] = useState(item?.name || "")

    return (
      <div className="space-y-2">
        <Label htmlFor="key">キー *</Label>
        <Input
          id="key"
          {...register(key, setKey)}
          placeholder="例: spots, dining"
          required
          disabled={!!item}
        />
        {!!item && <p className="text-xs text-muted-foreground">既存のカテゴリのキーは変更できません</p>}
      </div>
    )
  }

  const FormComponent = ({ item, onClose }: { item: TourCategoryType | null, onClose: (refreshData?: boolean) => void }) => (
    <ItemForm<TourCategoryType>
      item={item}
      onClose={onClose}
      title="ツアーカテゴリ"
      tableName="tour_categories"
      defaultIcon="ListTodo"
      storageFolder="tour_categories"
      renderExtraFields={renderExtraFields}
      nameField="name"
    />
  )

  return (
    <ItemsList<TourCategoryType>
      title="ツアーカテゴリ"
      tableName="tour_categories"
      FormComponent={FormComponent}
      renderExtraColumns={renderExtraColumns}
      orderBy="key"
    />
  )
} 