"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout"
import Image from "next/image"
import Link from "next/link"
import { renderIcon } from "@/lib/icon-utils"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { BaseItemType } from "@/lib/types"

interface ItemListClientProps<T extends BaseItemType> {
  title: string
  tableName: string
  renderExtra?: (item: T) => React.ReactNode
}

export function ItemListClient<T extends BaseItemType>({ 
  title, 
  tableName,
  renderExtra 
}: ItemListClientProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .order("display_order", { ascending: true })

        if (error) throw error

        // 画像URLを取得して各アイテムに追加
        const itemsWithImages = data.map(item => ({
          ...item,
          image: item.image_path 
            ? supabase.storage.from("cms-images").getPublicUrl(item.image_path).data.publicUrl
            : "/setakamuy.png?height=300&width=400"
        }))

        setItems(itemsWithImages)
      } catch (error) {
        console.error(`Error fetching ${tableName}:`, error)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [tableName])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">{title}</h1>
          <div className="text-center">読み込み中...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">{title}</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {items.length === 0 ? (
            <p className="text-center col-span-2">{title}がありません</p>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="border-primary/20">
                <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {renderIcon(item.icon)}
                      <h3 className="font-bold text-xl">{item.name}</h3>
                    </div>
                    <p className="text-gray-600 mb-2">{item.description}</p>
                    {renderExtra && renderExtra(item)}
                    {item.url && (
                      <Link href={item.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="mt-4">
                          詳しくはこちら
                        </Button>
                      </Link>
                    )}
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden relative">
                    <Image
                      src={item.image}
                      alt={item.name}
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