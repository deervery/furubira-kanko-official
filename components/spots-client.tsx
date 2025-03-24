"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout"
import Image from "next/image"
import type { SpotType } from "@/lib/site-data"
import Link from "next/link"
import { renderIcon } from "@/lib/icon-utils"

interface SpotsClientProps {
  spotsData: SpotType[]
}

export function SpotsClient({ spotsData }: SpotsClientProps) {
  const openGoogleMaps = (name: string, address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + address)}`, "_blank")
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">観光スポット</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {spotsData.length === 0 ? (
            <p className="text-center col-span-2">観光スポットがありません</p>
          ) : (
            spotsData.map((spot) => (
              <Card key={spot.id} className="border-primary/20">
                <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {renderIcon(spot.icon)}
                      <h3 className="font-bold text-xl">{spot.name}</h3>
                    </div>
                    <p className="text-gray-600 mb-2">{spot.description}</p>
                    {spot.address && <p className="text-sm text-gray-500">{spot.address}</p>}
                    {spot.facilities && <p className="text-sm text-gray-500 mt-2">施設：{spot.facilities}</p>}
                    {spot.url ? (
                      <Link href={spot.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="mt-4">
                          詳しくはこちら
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => spot.address && openGoogleMaps(spot.name, spot.address)}
                      >
                        地図で見る
                      </Button>
                    )}
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden relative">
                    <Image
                      src={spot.image}
                      alt={spot.name}
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

