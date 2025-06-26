import { db, storage } from "@/lib/firebase"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { ref, getDownloadURL } from "firebase/storage"
import type { SpotType, RestaurantType, AccommodationType, EventType, ShopType } from "@/lib/site-data"
import type React from "react"

// 画像URLを生成する関数を追加
async function getImageUrl(imagePath: string | null): Promise<string> {
  if (!imagePath) {
    return "/no_photo.jpg?height=300&width=400"
  }
  try {
    const imageRef = ref(storage, `cms-images/${imagePath}`)
    return await getDownloadURL(imageRef)
  } catch (error) {
    console.error("Error getting image URL:", error)
    return "/no_photo.jpg?height=300&width=400"
  }
}

// アイコン名を文字列として返す関数
export function getIconComponent(iconName: string): string {
  return iconName;
}

// 観光スポットデータを取得
export async function getSpots(): Promise<SpotType[]> {
  try {
    const spotsRef = collection(db, "spots")
    const q = query(spotsRef, orderBy("name"))
    const querySnapshot = await getDocs(q)
    
    const spots = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          address: data.address,
          facilities: data.facilities,
          image_path: data.image_path,
          image: await getImageUrl(data.image_path),
          icon: data.icon,
          url: data.url,
          display_order: data.display_order || 0
        }
      })
    )
    
    return spots
  } catch (error) {
    console.error("Error fetching spots:", error)
    return []
  }
}

// 飲食店データを取得
export async function getRestaurants(): Promise<RestaurantType[]> {
  try {
    const restaurantsRef = collection(db, "restaurants")
    const q = query(restaurantsRef, orderBy("name"))
    const querySnapshot = await getDocs(q)
    
    const restaurants = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          image_path: data.image_path,
          image: await getImageUrl(data.image_path),
          icon: data.icon,
          url: data.url,
          display_order: data.display_order || 0
        }
      })
    )
    
    return restaurants
  } catch (error) {
    console.error("Error fetching restaurants:", error)
    return []
  }
}

// 宿泊施設データを取得
export async function getAccommodations(): Promise<AccommodationType[]> {
  try {
    const accommodationsRef = collection(db, "accommodations")
    const q = query(accommodationsRef, orderBy("name"))
    const querySnapshot = await getDocs(q)
    
    const accommodations = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          image_path: data.image_path,
          image: await getImageUrl(data.image_path),
          icon: data.icon,
          url: data.url,
          display_order: data.display_order || 0
        }
      })
    )
    
    return accommodations
  } catch (error) {
    console.error("Error fetching accommodations:", error)
    return []
  }
}

// イベントデータを取得
export async function getEvents(): Promise<EventType[]> {
  try {
    const eventsRef = collection(db, "events")
    const q = query(eventsRef, orderBy("name"))
    const querySnapshot = await getDocs(q)
    
    const events = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          date: data.date,
          image_path: data.image_path,
          image: await getImageUrl(data.image_path),
          icon: data.icon,
          url: data.url,
          display_order: data.display_order || 0
        }
      })
    )
    
    return events
  } catch (error) {
    console.error("Error fetching events:", error)
    return []
  }
}

// 買い物スポットデータを取得
export async function getShops(): Promise<ShopType[]> {
  try {
    const shopsRef = collection(db, "shops")
    const q = query(shopsRef, orderBy("name"))
    const querySnapshot = await getDocs(q)
    
    const shops = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          type: data.type,
          image_path: data.image_path,
          image: await getImageUrl(data.image_path),
          icon: data.icon,
          url: data.url,
          display_order: data.display_order || 0
        }
      })
    )
    
    return shops
  } catch (error) {
    console.error("Error fetching shops:", error)
    return []
  }
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

    const tourCategoriesRef = collection(db, "tour_categories")
    const querySnapshot = await getDocs(tourCategoriesRef)

    const tourData: Record<string, any> = {}

    querySnapshot.docs.forEach((doc) => {
      const category = doc.data()
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