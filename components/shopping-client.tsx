"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Layout } from "@/components/layout"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import type { ShopType } from "@/lib/site-data"
import Link from "next/link"
import { renderIcon } from "@/lib/icon-utils"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

interface ShoppingClientProps {
  shopsData: ShopType[]
}

export function ShoppingClient({ shopsData }: ShoppingClientProps) {
  const [shops, setShops] = useState<ShopType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const { data, error } = await supabase
          .from("shops")
          .select("*")
          .order("display_order", { ascending: true })

        if (error) throw error

        setShops(data)
      } catch (error) {
        console.error("Error fetching shops:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchShops()
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">買い物</h1>
          <div className="text-center">読み込み中...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">買い物</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {shops.length === 0 ? (
            <p className="text-center col-span-2">買い物スポットがありません</p>
          ) : (
            shops.map((shop) => (
              <Card key={shop.id} className="border-primary/20">
                <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {renderIcon(shop.icon)}
                      <h3 className="font-bold text-xl">{shop.name}</h3>
                    </div>
                    <p className="text-gray-600 mb-2">{shop.description}</p>
                    <p className="text-sm text-gray-500">{shop.type}</p>
                    {shop.url ? (
                      <Link href={shop.url} target="_blank" rel="noopener noreferrer">
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
                      src={shop.image}
                      alt={shop.name}
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

