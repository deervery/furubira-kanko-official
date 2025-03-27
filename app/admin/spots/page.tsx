"use client"

import { useState } from "react"
import { ItemsList } from "@/components/admin/item-list"
import { ItemForm } from "@/components/admin/item-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableCell } from "@/components/ui/table"
import type { SpotType } from "@/lib/types"

export default function SpotsAdminPage() {
  const renderExtraColumns = (spot: SpotType) => (
    <>
      <TableCell>{spot.address || "-"}</TableCell>
      <TableCell>{spot.facilities || "-"}</TableCell>
    </>
  )

  const renderExtraFields = ({ item, register }: { 
    item: SpotType | null,
    register: (value: string, setter: (value: string) => void) => any
  }) => {
    const [address, setAddress] = useState(item?.address || "")
    const [facilities, setFacilities] = useState(item?.facilities || "")

    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="address">住所</Label>
          <Input
            id="address"
            {...register(address, setAddress)}
            placeholder="住所"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="facilities">施設情報</Label>
          <Input
            id="facilities"
            {...register(facilities, setFacilities)}
            placeholder="施設情報（駐車場、トイレなど）"
          />
        </div>
      </>
    )
  }

  const FormComponent = ({ item, onClose }: { item: SpotType | null, onClose: (refreshData?: boolean) => void }) => (
    <ItemForm<SpotType>
      item={item}
      onClose={onClose}
      title="観光スポット"
      tableName="spots"
      defaultIcon="MapPin"
      storageFolder="spots"
      renderExtraFields={renderExtraFields}
    />
  )

  return (
    <ItemsList<SpotType>
      title="観光スポット"
      tableName="spots"
      FormComponent={FormComponent}
      renderExtraColumns={renderExtraColumns}
    />
  )
} 