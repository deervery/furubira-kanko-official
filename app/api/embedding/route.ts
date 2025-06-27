import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const openAi = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const { content, title } = await req.json();

    if (!content || !title) {
      return NextResponse.json({ error: "Content and title are required" }, { status: 400 });
    }

    // OpenAI APIを使ってembeddingを生成
    const embeddingResponse = await openAi.embeddings.create({
      model: "text-embedding-ada-002",
      input: content
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Firestoreにデータを挿入
    try {
      await addDoc(collection(db, "furubira_info"), {
        title,
        content,
        embedding
      });
    } catch (error) {
      console.error(`Error inserting data: ${error}`);
      return NextResponse.json({ error: "Failed to insert data" }, { status: 500 });
    }

    return NextResponse.json({ message: "Data inserted successfully" });
  } catch (error) {
    console.error("Error generating embedding:", error);
    return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });
  }
} 