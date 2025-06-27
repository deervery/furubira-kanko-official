import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs/promises";
import dotenv from "dotenv";

// 環境変数を読み込む
dotenv.config();

// Firebaseの設定
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

async function fetchDataAndSave() {
  try {
    console.log("Fetching data from Firestore...");

    // Firestoreからデータを取得
    const querySnapshot = await getDocs(collection(db, "furubira_info"));
    const data = querySnapshot.docs.map(doc => ({
      title: doc.data().title,
      content: doc.data().content,
    }));

    // JSONファイルとして保存
    const jsonData = JSON.stringify(data, null, 2);
    const filePath = "./scripts/furubira_info.json";
    await fs.writeFile(filePath, jsonData, "utf8");

    console.log(`✅ JSONファイルが保存されました: ${filePath}`);
  } catch (error) {
    console.error("❌ データ取得に失敗:", error.message);
  }
}

// スクリプトを実行
fetchDataAndSave();
