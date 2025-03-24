import { createClient } from "@supabase/supabase-js"
import { spotsData, restaurantsData, accommodationsData, eventsData, shopsData } from "./seed-data-values"
import fs from "fs"
import path from "path"

// 環境変数を.envから読み込む
require("dotenv").config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("環境変数が設定されていません")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 画像をアップロードする関数
async function uploadImage(imagePath: string, category: string): Promise<string | null> {
  try {
    // 画像パスからファイル名を取得
    const fileName = path.basename(imagePath)

    // 画像ファイルが存在するか確認
    const publicDir = path.join(process.cwd(), "public")
    const filePath = path.join(publicDir, imagePath.replace(/^\//, ""))

    if (!fs.existsSync(filePath)) {
      console.warn(`画像ファイルが見つかりません: ${filePath}`)
      return null
    }

    // ファイルを読み込む
    const fileBuffer = fs.readFileSync(filePath)

    // Supabaseにアップロード
    const storagePath = `${category}/${fileName}`
    const { error } = await supabase.storage.from("cms-images").upload(storagePath, fileBuffer, {
      contentType: "image/jpeg", // 適切なMIMEタイプに変更してください
      upsert: true,
    })

    if (error) {
      console.error(`画像アップロードエラー: ${error.message}`)
      return null
    }

    return storagePath
  } catch (error) {
    console.error("画像アップロードエラー:", error)
    return null
  }
}

// データをシードする関数
async function seedData() {
  try {
    console.log("データシードを開始します...")

    // 観光スポットデータ
    for (const spot of spotsData) {
      const imagePath = spot.image && typeof spot.image === "string" ? await uploadImage(spot.image, "spots") : null

      const { error } = await supabase.from("spots").insert({
        name: spot.name,
        description: spot.description,
        address: spot.address || null,
        facilities: spot.facilities || null,
        image_path: imagePath,
        icon: spot.icon,
      })

      if (error) {
        console.error(`観光スポット「${spot.name}」の挿入エラー:`, error)
      } else {
        console.log(`観光スポット「${spot.name}」を挿入しました`)
      }
    }

    // 飲食店データ
    for (const restaurant of restaurantsData) {
      const imagePath =
        restaurant.image && typeof restaurant.image === "string"
          ? await uploadImage(restaurant.image, "restaurants")
          : null

      const { error } = await supabase.from("restaurants").insert({
        name: restaurant.name,
        description: restaurant.description,
        image_path: imagePath,
        icon: restaurant.icon,
      })

      if (error) {
        console.error(`飲食店「${restaurant.name}」の挿入エラー:`, error)
      } else {
        console.log(`飲食店「${restaurant.name}」を挿入しました`)
      }
    }

    // 宿泊施設データ
    for (const accommodation of accommodationsData) {
      const imagePath =
        accommodation.image && typeof accommodation.image === "string"
          ? await uploadImage(accommodation.image, "accommodations")
          : null

      const { error } = await supabase.from("accommodations").insert({
        name: accommodation.name,
        description: accommodation.description,
        image_path: imagePath,
        icon: accommodation.icon,
      })

      if (error) {
        console.error(`宿泊施設「${accommodation.name}」の挿入エラー:`, error)
      } else {
        console.log(`宿泊施設「${accommodation.name}」を挿入しました`)
      }
    }

    // イベントデータ
    for (const event of eventsData) {
      const imagePath = event.image && typeof event.image === "string" ? await uploadImage(event.image, "events") : null

      const { error } = await supabase.from("events").insert({
        name: event.name,
        description: event.description,
        date: event.date,
        image_path: imagePath,
        icon: event.icon,
      })

      if (error) {
        console.error(`イベント「${event.name}」の挿入エラー:`, error)
      } else {
        console.log(`イベント「${event.name}」を挿入しました`)
      }
    }

    // 買い物スポットデータ
    for (const shop of shopsData) {
      const imagePath = shop.image && typeof shop.image === "string" ? await uploadImage(shop.image, "shops") : null

      const { error } = await supabase.from("shops").insert({
        name: shop.name,
        description: shop.description,
        type: shop.type,
        image_path: imagePath,
        icon: shop.icon,
      })

      if (error) {
        console.error(`買い物スポット「${shop.name}」の挿入エラー:`, error)
      } else {
        console.log(`買い物スポット「${shop.name}」を挿入しました`)
      }
    }

    console.log("データシードが完了しました")
  } catch (error) {
    console.error("データシードエラー:", error)
  }
}

// スクリプトを実行
seedData()