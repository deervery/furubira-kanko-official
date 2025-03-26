"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout"
import Image from "next/image"
import type { RestaurantType } from "@/lib/site-data"
import Link from "next/link"
import { renderIcon } from "@/lib/icon-utils"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface DiningClientProps {
  restaurantsData: RestaurantType[]
}

export function DiningClient({ restaurantsData }: DiningClientProps) {
  const [restaurants, setRestaurants] = useState<RestaurantType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("*")
          .order("display_order", { ascending: true })

        if (error) throw error

        setRestaurants(data)
      } catch (error) {
        console.error("Error fetching restaurants:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRestaurants()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">飲食店</h1>
          <div className="text-center">読み込み中...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">飲食店</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {restaurants.length === 0 ? (
            <p className="text-center col-span-2">飲食店がありません</p>
          ) : (
            restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="shadow-lg">
                <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {renderIcon(restaurant.icon)}
                      <h3 className="font-bold text-xl">{restaurant.name}</h3>
                    </div>
                    <p className="text-gray-600 mb-2">{restaurant.description}</p>
                    {restaurant.url ? (
                      <Link href={restaurant.url} target="_blank" rel="noopener noreferrer">
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
                      src={restaurant.image}
                      alt={restaurant.name}
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

