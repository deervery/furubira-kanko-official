import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"

export async function GET() {
  try {
    const docRef = doc(db, "system_message", "default");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return NextResponse.json({ message: docSnap.data().message })
    } else {
      return NextResponse.json({ message: "" })
    }
  } catch (error) {
    console.error("Failed to fetch system message", error)
    return NextResponse.json({ error: "システムメッセージの取得に失敗しました" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "無効なメッセージです" }, { status: 400 })
    }

    const docRef = doc(db, "system_message", "default");
    await setDoc(docRef, { message }, { merge: true });

    return NextResponse.json({
      message: "システムメッセージが更新されました",
      data: { message },
    })
  } catch (error) {
    console.error("System Message Update Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新に失敗しました" }, { status: 500 })
  }
}

