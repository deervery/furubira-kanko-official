"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Layout } from "@/components/layout"
import Image from "next/image"
import Link from "next/link"
import { renderIcon } from "@/lib/icon-utils"
import { useEffect, useState } from "react"
import { db, storage } from "@/lib/firebase"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { ref, getDownloadURL } from "firebase/storage"
import type { BaseItemType } from "@/lib/types"

interface ItemListClientProps<T extends BaseItemType> {
  title: string
  tableName: string
  renderExtra?: (item: T) => React.ReactNode
}

// 画像URLを生成する関数
async function getImageUrl(imagePath: string | null): Promise<string> {
  if (!imagePath) {
    return "/no_photo.jpg?height=300&width=400"
  }

  // 画像パスが既にURLの場合はそのまま返す
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  try {
    const imageRef = ref(storage, imagePath)
    return await getDownloadURL(imageRef)
  } catch (error) {
    console.error("Error getting image URL:", error)
    return "/no_photo.jpg?height=300&width=400"
  }
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
        const q = query(
          collection(db, tableName),
          orderBy("display_order", "asc")
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];

        // 画像URLを取得して各アイテムに追加
        const itemsWithImages = await Promise.all(
          data.map(async (item) => {
            const imageUrl = await getImageUrl(item.image_path);
            return {
              ...item,
              image: imageUrl
            };
          })
        );

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