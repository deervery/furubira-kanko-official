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
import { useI18n } from "@/components/i18n/i18n-provider"
import { t } from "@/lib/i18n/t"

interface ChatMessageType {
  id: string
  role: string
  content: string
  timestamp?: string
  isTyping?: boolean
}

export function ChatWindow() {
  const { messages: i18nMessages } = useI18n()
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

        // データが配列でない場合は空配列として扱う
        const messagesArray = Array.isArray(data) ? data : []

        // Ensure each message has the required properties
        const validMessages = messagesArray
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
              content: t(i18nMessages, "chat.welcome"),
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
            content: t(i18nMessages, "chat.welcome"),
            timestamp: new Date().toISOString(),
          },
        ])
      }
    }
    loadMessages()
  }, [sessionId, i18nMessages])

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

      // ユーザーがメッセージを送信した瞬間に、直前のメッセージだけを保持
      setMessages([userMessage])
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
          throw new Error(t(i18nMessages, "chat.error_response_failed"))
        }

        if (!response.body) {
          throw new Error(t(i18nMessages, "chat.error_no_body"))
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

          const chunk = decoder.decode(value)

          if (isFirstChunk && chunk.trim() !== "") {
            isFirstChunk = false
            setIsThinking(false)

            const assistantMessageId = nanoid()
            accumulatedContent = chunk

            // 最新のユーザーとアシスタントメッセージだけを保持
            setMessages((prev) => [
              prev[prev.length - 1], // 最新のユーザーメッセージ
              {
                id: assistantMessageId,
                role: "assistant",
                content: chunk,
                timestamp: new Date().toISOString(),
                isTyping: true,
              },
            ])
          } else if (!isFirstChunk) {
            accumulatedContent += chunk

            setMessages((prev) =>
              prev.map((msg) =>
                msg.role === "assistant" && msg.isTyping ? { ...msg, content: accumulatedContent } : msg,
              ),
            )
          }
        }

        setMessages((prev) => prev.map((msg) => (msg.isTyping ? { ...msg, isTyping: false } : msg)))
      } catch (error) {
        console.error("Error sending message:", error)
        toast({
          title: t(i18nMessages, "chat.error_title"),
          description: error instanceof Error ? error.message : t(i18nMessages, "chat.error_send_failed"),
          variant: "destructive",
        })

        setIsThinking(false)

        setMessages((prev) => [
          prev[prev.length - 1], // 最新のユーザーメッセージ
          {
            id: nanoid(),
            role: "assistant",
            content: t(i18nMessages, "chat.error_generic"),
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
        {t(i18nMessages, "chat.button_label")}
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[350px] h-[500px] flex flex-col shadow-lg overflow-hidden p-0">
      <div className="py-3 px-4 flex justify-between items-center bg-primary text-white w-full">
        <h3 className="font-semibold">{t(i18nMessages, "chat.title")}</h3>
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
          <div className="flex flex-col items-center mb-4">
            <img 
              src="/furuppy.gif" 
              alt={t(i18nMessages, "chat.thinking_alt")}
              className="w-48 h-48 object-contain mb-2"
            />
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t(i18nMessages, "chat.thinking")}
            </div>
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="px-4 py-3 border-t flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t(i18nMessages, "chat.placeholder")}
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={isLoading} className="bg-primary hover:bg-primary/80">
          <SendIcon className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  )
}

