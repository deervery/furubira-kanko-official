import { supabase } from "@/lib/supabase"
import type { SpotType, RestaurantType, AccommodationType, EventType, ShopType } from "@/lib/site-data"
import type React from "react"

// 画像URLを生成する関数を追加
function getImageUrl(imagePath: string | null): string {
  if (!imagePath) {
    return "/no_photo.jpg?height=300&width=400"
  }
  return supabase.storage.from("cms-images").getPublicUrl(imagePath).data.publicUrl
}

// アイコン名を文字列として返す関数
export function getIconComponent(iconName: string): string {
  return iconName;
}

// 観光スポットデータを取得
export async function getSpots(): Promise<SpotType[]> {
  const { data, error } = await supabase.from("spots").select("*").order("name")
  if (error) {
    console.error("Error fetching spots:", error)
    return []
  }

  return data.map((spot) => ({
    id: spot.id,
    name: spot.name,
    description: spot.description,
    address: spot.address,
    facilities: spot.facilities,
    image_path: spot.image_path,
    image: getImageUrl(spot.image_path),
    icon: spot.icon,
    url: spot.url,
    display_order: spot.display_order || 0
  }))
}

// 飲食店データを取得
export async function getRestaurants(): Promise<RestaurantType[]> {
  const { data, error } = await supabase.from("restaurants").select("*").order("name")

  if (error) {
    console.error("Error fetching restaurants:", error)
    return []
  }

  return data.map((restaurant) => ({
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description,
    image_path: restaurant.image_path,
    image: getImageUrl(restaurant.image_path),
    icon: restaurant.icon,
    url: restaurant.url,
    display_order: restaurant.display_order || 0
  }))
}

// 宿泊施設データを取得
export async function getAccommodations(): Promise<AccommodationType[]> {
  const { data, error } = await supabase.from("accommodations").select("*").order("name")

  if (error) {
    console.error("Error fetching accommodations:", error)
    return []
  }

  return data.map((accommodation) => ({
    id: accommodation.id,
    name: accommodation.name,
    description: accommodation.description,
    image_path: accommodation.image_path,
    image: getImageUrl(accommodation.image_path),
    icon: accommodation.icon,
    url: accommodation.url,
    display_order: accommodation.display_order || 0
  }))
}

// イベントデータを取得
export async function getEvents(): Promise<EventType[]> {
  const { data, error } = await supabase.from("events").select("*").order("name")

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data.map((event) => ({
    id: event.id,
    name: event.name,
    description: event.description,
    date: event.date,
    image_path: event.image_path,
    image: getImageUrl(event.image_path),
    icon: event.icon,
    url: event.url,
    display_order: event.display_order || 0
  }))
}

// 買い物スポットデータを取得
export async function getShops(): Promise<ShopType[]> {
  const { data, error } = await supabase.from("shops").select("*").order("name")

  if (error) {
    console.error("Error fetching shops:", error)
    return []
  }

  return data.map((shop) => ({
    id: shop.id,
    name: shop.name,
    description: shop.description,
    type: shop.type,
    image_path: shop.image_path,
    image: getImageUrl(shop.image_path),
    icon: shop.icon,
    url: shop.url,
    display_order: shop.display_order || 0
  }))
}

// ツアーデータを取得
export async function getTourData() {
  try {
    const [spots, restaurants, accommodations, shops] = await Promise.all([
      getSpots(),
      getRestaurants(),
      getAccommodations(),
      getShops(),
    ])

    const { data: categories, error } = await supabase.from("tour_categories").select("*")

    if (error) {
      console.error("Error fetching tour categories:", error)
      return {}
    }

    const tourData: Record<string, any> = {}

    categories.forEach((category) => {
      let items: any[] = []

      switch (category.key) {
        case "spots":
          items = spots
          break
        case "dining":
          items = restaurants
          break
        case "accommodations":
          items = accommodations
          break
        case "shopping":
          items = shops
          break
      }

      tourData[category.key] = {
        title: category.title,
        timeRange: category.name,
        items,
      }
    })

    return tourData
  } catch (error) {
    console.error("Error fetching tour data:", error)
    // フォールバックデータを返す
    return {
      dining: { title: "新鮮な海の幸を堪能する", timeRange: "港寿し・寿味などの人気店で昼食", items: [] },
      spots: { title: "古平の自然と文化に触れる", timeRange: "温泉しおかぜでゆったりと", items: [] },
      shopping: { title: "お土産選び", timeRange: "伝統の味と技を持ち帰る", items: [] },
      accommodations: { title: "心温まる宿で古平の夜を過ごす", timeRange: "民宿・旅館でチェックイン", items: [] },
    }
  }
}