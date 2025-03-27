"use client"

import { useState } from "react"
import { ItemsList } from "@/components/admin/item-list"
import { ItemForm } from "@/components/admin/item-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableCell } from "@/components/ui/table"
import type { EventType } from "@/lib/types"

export default function EventsAdminPage() {
  const renderExtraColumns = (event: EventType) => (
    <TableCell>{event.date || "-"}</TableCell>
  )

  const renderExtraFields = ({ item, register }: { 
    item: EventType | null,
    register: (value: string, setter: (value: string) => void) => any
  }) => {
    const [date, setDate] = useState(item?.date || "")

    return (
      <div className="space-y-2">
        <Label htmlFor="date">開催日 *</Label>
        <Input
          id="date"
          {...register(date, setDate)}
          placeholder="例: 7月・9月開催"
          required
        />
      </div>
    )
  }

  const FormComponent = ({ item, onClose }: { item: EventType | null, onClose: (refreshData?: boolean) => void }) => (
    <ItemForm<EventType>
      item={item}
      onClose={onClose}
      title="イベント"
      tableName="events"
      defaultIcon="Calendar"
      storageFolder="events"
      renderExtraFields={renderExtraFields}
    />
  )

  return (
    <ItemsList<EventType>
      title="イベント"
      tableName="events"
      FormComponent={FormComponent}
      renderExtraColumns={renderExtraColumns}
    />
  )
} 