import "dotenv/config";
import { OpenAI } from "openai";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from "fs";

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// JSONファイルからデータを読み込む
const furubiraData = JSON.parse(
  fs.readFileSync("furubira_content.json", "utf8")
);

export async function insertFurubiraData() {
  for (const item of furubiraData) {
    // OpenAI API を使って embedding を生成
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: item.content,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Firestore にデータを挿入
    try {
      await addDoc(collection(db, "furubira_info"), {
        title: item.title,
        content: item.content,
        embedding,
      });
      console.log(`Inserted: ${item.title}`);
    } catch (error) {
      console.error(`Error inserting data: ${error.message}`);
    }
  }
}

// スクリプトを実行
insertFurubiraData();
