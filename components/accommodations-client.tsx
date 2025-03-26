"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout"
import Image from "next/image"
import type { AccommodationType } from "@/lib/site-data"
import Link from "next/link"
import { renderIcon } from "@/lib/icon-utils"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface AccommodationsClientProps {
  accommodationsData: AccommodationType[]
}

export function AccommodationsClient({ accommodationsData }: AccommodationsClientProps) {
  const [accommodations, setAccommodations] = useState<AccommodationType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAccommodations = async () => {
      try {
        const { data, error } = await supabase
          .from("accommodations")
          .select("*")
          .order("display_order", { ascending: true })

        if (error) throw error

        setAccommodations(data)
      } catch (error) {
        console.error("Error fetching accommodations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccommodations()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">宿泊施設</h1>
          <div className="text-center">読み込み中...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">宿泊施設</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {accommodations.length === 0 ? (
            <p className="text-center col-span-2">宿泊施設がありません</p>
          ) : (
            accommodations.map((accommodation) => (
              <Card key={accommodation.id} className="shadow-lg">
                <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {renderIcon(accommodation.icon)}
                      <h3 className="font-bold text-xl">{accommodation.name}</h3>
                    </div>
                    <p className="text-gray-600 mb-2">{accommodation.description}</p>
                    {accommodation.url ? (
                      <Link href={accommodation.url} target="_blank" rel="noopener noreferrer">
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
                      src={accommodation.image}
                      alt={accommodation.name}
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

