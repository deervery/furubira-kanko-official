import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc } from "firebase/firestore"
import { getStorage, ref, uploadBytes } from "firebase/storage"
import { spotsData, restaurantsData, accommodationsData, eventsData, shopsData } from "./seed-data-values"
import fs from "fs"
import path from "path"

// 環境変数を.envから読み込む
require("dotenv").config()

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

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

    // Firebase Storageにアップロード
    const storagePath = `${category}/${fileName}`
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, fileBuffer, {
      contentType: "image/jpeg", // 適切なMIMEタイプに変更してください
    });

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

      try {
        await addDoc(collection(db, "spots"), {
          name: spot.name,
          description: spot.description,
          address: spot.address || null,
          facilities: spot.facilities || null,
          image_path: imagePath,
          icon: spot.icon,
        });
        console.log(`観光スポット「${spot.name}」を挿入しました`)
      } catch (error) {
        console.error(`観光スポット「${spot.name}」の挿入エラー:`, error)
      }
    }

    // 飲食店データ
    for (const restaurant of restaurantsData) {
      const imagePath =
        restaurant.image && typeof restaurant.image === "string"
          ? await uploadImage(restaurant.image, "restaurants")
          : null

      try {
        await addDoc(collection(db, "restaurants"), {
          name: restaurant.name,
          description: restaurant.description,
          image_path: imagePath,
          icon: restaurant.icon,
        });
        console.log(`飲食店「${restaurant.name}」を挿入しました`)
      } catch (error) {
        console.error(`飲食店「${restaurant.name}」の挿入エラー:`, error)
      }
    }

    // 宿泊施設データ
    for (const accommodation of accommodationsData) {
      const imagePath =
        accommodation.image && typeof accommodation.image === "string"
          ? await uploadImage(accommodation.image, "accommodations")
          : null

      try {
        await addDoc(collection(db, "accommodations"), {
          name: accommodation.name,
          description: accommodation.description,
          image_path: imagePath,
          icon: accommodation.icon,
        });
        console.log(`宿泊施設「${accommodation.name}」を挿入しました`)
      } catch (error) {
        console.error(`宿泊施設「${accommodation.name}」の挿入エラー:`, error)
      }
    }

    // イベントデータ
    for (const event of eventsData) {
      const imagePath = event.image && typeof event.image === "string" ? await uploadImage(event.image, "events") : null

      try {
        await addDoc(collection(db, "events"), {
          name: event.name,
          description: event.description,
          date: event.date,
          image_path: imagePath,
          icon: event.icon,
        });
        console.log(`イベント「${event.name}」を挿入しました`)
      } catch (error) {
        console.error(`イベント「${event.name}」の挿入エラー:`, error)
      }
    }

    // 買い物スポットデータ
    for (const shop of shopsData) {
      const imagePath = shop.image && typeof shop.image === "string" ? await uploadImage(shop.image, "shops") : null

      try {
        await addDoc(collection(db, "shops"), {
          name: shop.name,
          description: shop.description,
          type: shop.type,
          image_path: imagePath,
          icon: shop.icon,
        });
        console.log(`買い物スポット「${shop.name}」を挿入しました`)
      } catch (error) {
        console.error(`買い物スポット「${shop.name}」の挿入エラー:`, error)
      }
    }

    console.log("データシードが完了しました")
  } catch (error) {
    console.error("データシードエラー:", error)
  }
}

// スクリプトを実行
seedData()