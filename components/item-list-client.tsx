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
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"
import { resolvePublicImageUrl } from "@/lib/image-url"

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
  const { lang, messages } = useI18n()
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
        const itemsWithImages = data.map((item: any) => ({
          ...localizeItem(item, lang),
          image: resolvePublicImageUrl(item.image_path, "/no_photo.jpg?height=300&width=400")
        }))

        setItems(itemsWithImages)
      } catch (error) {
        console.error(`Error fetching ${tableName}:`, error)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [tableName, lang])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">{title}</h1>
          <div className="text-center">{t(messages, "common.loading")}</div>
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
            <p className="text-center col-span-2">{t(messages, "common.no_items")}</p>
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
                          {t(messages, "cms.see_more_details_here")}
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
                        target.src = "/no_photo.jpg?height=300&width=400"
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

function localizeItem<TItem extends Record<string, any>>(item: TItem, lang: string): TItem {
  if (lang !== "en") return item

  const out: Record<string, any> = { ...item }
  if (typeof item.name_en === "string" && item.name_en.trim()) out.name = item.name_en
  if (typeof item.description_en === "string" && item.description_en.trim()) out.description = item.description_en
  if (typeof item.date_en === "string" && item.date_en.trim()) out.date = item.date_en
  return out as TItem
}