"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { nanoid } from "nanoid"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "./chat-message"
import { Loader2, MinimizeIcon, MaximizeIcon, SendIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ChatMessageType {
  id: string
  role: string
  content: string
  timestamp?: string
  isTyping?: boolean
}

export function ChatWindow() {
  const [isMinimized, setIsMinimized] = useState(true)
  const [message, setMessage] = useState("")
  const [sessionId] = useState(() => nanoid())
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isThinking, setIsThinking] = useState(false) // 考え中の状態を追加
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Load existing messages for the session
  useEffect(() => {
    async function loadMessages() {
      try {
        const response = await fetch(`/api/chat/${sessionId}`)
        if (!response.ok) throw new Error("Failed to load messages")
        const data = await response.json()

        // Ensure each message has the required properties
        const validMessages = data
          .filter((msg: any) => msg && typeof msg.role === "string" && typeof msg.content === "string")
          .map((msg: any) => ({
            id: msg.id || nanoid(),
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }))

        if (validMessages.length === 0) {
          // Add a default welcome message if no messages exist
          setMessages([
            {
              id: nanoid(),
              role: "assistant",
              content: "こんにちは！古平町の観光について気軽に質問してね！",
              timestamp: new Date().toISOString(),
            },
          ])
        } else {
          setMessages(validMessages)
        }
      } catch (error) {
        console.error("Error loading messages:", error)
        // Set default welcome message on error
        setMessages([
          {
            id: nanoid(),
            role: "assistant",
            content: "こんにちは！古平町の観光について気軽に質問してね！",
            timestamp: new Date().toISOString(),
          },
        ])
      }
    }
    loadMessages()
  }, [sessionId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      console.log("Sending message:", message)
      const userMessage = {
        id: nanoid(),
        role: "user",
        content: message.trim(),
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])
      setMessage("")
      setIsLoading(true)
      setIsThinking(true)

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: message.trim(),
            sessionId,
          }),
        })

        console.log("Response status:", response.status)

        if (!response.ok) {
          throw new Error("応答の取得に失敗しました")
        }

        if (!response.body) {
          throw new Error("レスポンスボディがありません")
        }

        // テキストストリームを読み込む
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let accumulatedContent = ""
        let isFirstChunk = true

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          // 新しいチャンクを処理（シンプルなテキストストリーム）
          const chunk = decoder.decode(value)

          // 最初のチャンクが来たら、考え中の状態をオフにして応答メッセージを追加
          if (isFirstChunk && chunk.trim() !== "") {
            isFirstChunk = false
            setIsThinking(false)

            // 空の応答メッセージを追加（ストリーミング用）
            const assistantMessageId = nanoid()
            accumulatedContent = chunk

            setMessages((prev) => [
              ...prev,
              {
                id: assistantMessageId,
                role: "assistant",
                content: chunk,
                timestamp: new Date().toISOString(),
                isTyping: true,
              },
            ])
          } else if (!isFirstChunk) {
            // 2回目以降のチャンクは既存のメッセージを更新
            accumulatedContent += chunk

            // メッセージを更新
            setMessages((prev) =>
              prev.map((msg) =>
                msg.role === "assistant" && msg.isTyping ? { ...msg, content: accumulatedContent } : msg,
              ),
            )
          }
        }

        // ストリーミング完了時にタイピング状態を解除
        setMessages((prev) => prev.map((msg) => (msg.isTyping ? { ...msg, isTyping: false } : msg)))
      } catch (error) {
        console.error("Error sending message:", error)
        toast({
          title: "エラー",
          description: error instanceof Error ? error.message : "メッセージの送信に失敗しました",
          variant: "destructive",
        })

        setIsThinking(false) // エラー時に考え中の状態をオフ

        // エラーメッセージを追加
        setMessages((prev) => [
          ...prev,
          {
            id: nanoid(),
            role: "assistant",
            content: "申し訳ありません、エラーが発生しました。",
            timestamp: new Date().toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages]);

  if (isMinimized) {
    return (
      <Button
        className="fixed bottom-4 right-4 rounded-full p-4 bg-primary hover:bg-primary/80 text-white"
        onClick={() => setIsMinimized(false)}
      >
        <MaximizeIcon className="mr-2 h-4 w-4" />
        ふるびらAIガイドに質問する
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[350px] h-[500px] flex flex-col shadow-lg overflow-hidden p-0">
      <div className="py-3 px-4 flex justify-between items-center bg-primary text-white w-full">
        <h3 className="font-semibold">ふるびらAIガイド</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(true)}
          className="h-8 w-8 text-white hover:bg-white/10"
        >
          <MinimizeIcon className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isThinking && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            考え中...
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="古平町や観光について聞きたいこと"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading} className="bg-primary hover:bg-primary/80">
          <SendIcon className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  )
}

