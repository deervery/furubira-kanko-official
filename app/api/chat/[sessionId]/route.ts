import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;

  try {
    const q = query(
      collection(db, "chat"),
      where("sessionId", "==", sessionId),
      orderBy("timestamp", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(doc => ({
      role: doc.data().role,
      content: doc.data().content,
    }));

    return Response.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

