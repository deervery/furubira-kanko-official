"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import type { EventType } from "@/lib/site-data"
import Link from "next/link"
import { renderIcon } from "@/lib/icon-utils"

interface EventsClientProps {
  eventsData: EventType[]
}

export function EventsClient({ eventsData }: EventsClientProps) {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">イベント</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {eventsData.length === 0 ? (
            <p className="text-center col-span-2">イベントがありません</p>
          ) : (
            eventsData.map((event) => (
              <Card key={event.id} className="border-primary/20">
                <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {renderIcon(event.icon)}
                      <h3 className="font-bold text-xl">{event.name}</h3>
                    </div>
                    <p className="text-gray-600 mb-2">{event.description}</p>
                    <p className="text-sm text-gray-500">{event.date}</p>
                    {event.url ? (
                      <Link href={event.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="mt-4">
                          詳しくはこちら
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" className="mt-4" disabled>
                        詳しくはこちら
                      </Button>
                    )}
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden relative">
                    <Image
                      src={event.image}
                      alt={event.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/setakamuy.png?height=300&width=400"
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}

