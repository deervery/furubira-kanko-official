"use client"

import { ItemListClient } from "@/components/item-list-client"
import type { EventType } from "@/lib/types"

export default function EventsPage() {
  const renderExtra = (event: EventType) => (
    <p className="text-sm text-gray-500">{event.date}</p>
  )

  return (
    <ItemListClient<EventType>
      title="イベント"
      tableName="events"
      renderExtra={renderExtra}
    />
  )
}

