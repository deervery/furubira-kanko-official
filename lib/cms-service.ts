import { supabase } from "@/lib/supabase"
import type { SpotType, RestaurantType, AccommodationType, EventType, ShopType } from "@/lib/site-data"
import type React from "react"
import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n/lang"
import rawMessages from "@/locales/messages.json"
import { resolvePublicImageUrl } from "@/lib/image-url"

// 画像URLを生成する関数を追加
function getImageUrl(imagePath: string | null): string {
  return resolvePublicImageUrl(imagePath, "/no_photo.jpg?height=300&width=400")
}

// アイコン名を文字列として返す関数
export function getIconComponent(iconName: string): string {
  return iconName;
}

function normalizeTextForLookup(s: unknown): string {
  if (typeof s !== "string") return ""
  return (
    s
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\u3000/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  )
}

function buildCmsValueMap(messagesByLang: any) {
  /** @type {Map<string, string>} normalizedValue -> cmsKey */
  const map = new Map<string, string>()
  const cms = messagesByLang?.cms ?? {}
  for (const [k, v] of Object.entries(cms)) {
    const norm = normalizeTextForLookup(v)
    if (!norm) continue
    // If duplicates exist, keep first (stable)
    if (!map.has(norm)) map.set(norm, String(k))
  }
  return map
}

const jaCmsValueToKey = buildCmsValueMap((rawMessages as any).ja)
const enCms = ((rawMessages as any).en?.cms ?? {}) as Record<string, unknown>

function translateCmsFallback(lang: Lang, original: unknown): string | null {
  // Only try fallback for English (current use-case)
  if (lang !== "en") return null
  const norm = normalizeTextForLookup(original)
  if (!norm) return null
  const cmsKey = jaCmsValueToKey.get(norm)
  if (!cmsKey) return null
  const enVal = enCms[cmsKey]
  return typeof enVal === "string" && enVal.trim() ? enVal : null
}

// 観光スポットデータを取得
export async function getSpots(lang: Lang = DEFAULT_LANG): Promise<SpotType[]> {
  const { data, error } = await supabase.from("spots").select("*").order("name")
  if (error) {
    console.error("Error fetching spots:", error)
    return []
  }

  return data.map((spot) => ({
    id: spot.id,
    name: lang === "en" ? (spot.name_en || spot.name) : spot.name,
    description: lang === "en" ? (spot.description_en || spot.description) : spot.description,
    address: spot.address,
    facilities: lang === "en" ? (spot.facilities_en || spot.facilities) : spot.facilities,
    image_path: spot.image_path,
    image: getImageUrl(spot.image_path),
    icon: spot.icon,
    url: spot.url,
    display_order: spot.display_order || 0
  }))
}

// 飲食店データを取得
export async function getRestaurants(lang: Lang = DEFAULT_LANG): Promise<RestaurantType[]> {
  const { data, error } = await supabase.from("restaurants").select("*").order("name")

  if (error) {
    console.error("Error fetching restaurants:", error)
    return []
  }

  return data.map((restaurant) => ({
    id: restaurant.id,
    name: lang === "en" ? (restaurant.name_en || restaurant.name) : restaurant.name,
    description: lang === "en" ? (restaurant.description_en || restaurant.description) : restaurant.description,
    image_path: restaurant.image_path,
    image: getImageUrl(restaurant.image_path),
    icon: restaurant.icon,
    url: restaurant.url,
    display_order: restaurant.display_order || 0
  }))
}

// 宿泊施設データを取得
export async function getAccommodations(lang: Lang = DEFAULT_LANG): Promise<AccommodationType[]> {
  const { data, error } = await supabase.from("accommodations").select("*").order("name")

  if (error) {
    console.error("Error fetching accommodations:", error)
    return []
  }

  return data.map((accommodation) => ({
    id: accommodation.id,
    name: lang === "en" ? (accommodation.name_en || accommodation.name) : accommodation.name,
    description: lang === "en" ? (accommodation.description_en || accommodation.description) : accommodation.description,
    image_path: accommodation.image_path,
    image: getImageUrl(accommodation.image_path),
    icon: accommodation.icon,
    url: accommodation.url,
    display_order: accommodation.display_order || 0
  }))
}

// イベントデータを取得
export async function getEvents(lang: Lang = DEFAULT_LANG): Promise<EventType[]> {
  const { data, error } = await supabase.from("events").select("*").order("name")

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data.map((event) => ({
    id: event.id,
    name: lang === "en" ? (event.name_en || event.name) : event.name,
    description: lang === "en" ? (event.description_en || event.description) : event.description,
    date: lang === "en" ? (event.date_en || event.date) : event.date,
    image_path: event.image_path,
    image: getImageUrl(event.image_path),
    icon: event.icon,
    url: event.url,
    display_order: event.display_order || 0
  }))
}

// 買い物スポットデータを取得
export async function getShops(lang: Lang = DEFAULT_LANG): Promise<ShopType[]> {
  const { data, error } = await supabase.from("shops").select("*").order("name")

  if (error) {
    console.error("Error fetching shops:", error)
    return []
  }

  return data.map((shop) => ({
    id: shop.id,
    name:
      (lang === "en" ? (shop.name_en || translateCmsFallback(lang, shop.name) || shop.name) : shop.name) ??
      shop.name,
    description:
      (lang === "en"
        ? (shop.description_en || translateCmsFallback(lang, shop.description) || shop.description)
        : shop.description) ?? shop.description,
    // As requested, show the DB value as-is (no "Type:" / "種別" label, no translation).
    type: shop.type,
    image_path: shop.image_path,
    image: getImageUrl(shop.image_path),
    icon: shop.icon,
    url: shop.url,
    display_order: shop.display_order || 0
  }))
}

// ツアーデータを取得
export async function getTourData(langInput?: string | Lang) {
  const lang: Lang = isLang(langInput as string) ? (langInput as Lang) : DEFAULT_LANG
  try {
    const [spots, restaurants, accommodations, shops] = await Promise.all([
      getSpots(lang),
      getRestaurants(lang),
      getAccommodations(lang),
      getShops(lang),
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