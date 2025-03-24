"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function SystemMessageForm() {
  const [systemMessage, setSystemMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // DBからシステムメッセージを取得する
  useEffect(() => {
    async function fetchSystemMessage() {
      try {
        const response = await fetch("/api/system_message")
        if (!response.ok) {
          throw new Error("システムメッセージの取得に失敗しました")
        }
        const data = await response.json()
        setSystemMessage(data.message)
      } catch (err: any) {
        toast({
          title: "エラー",
          description: err.message || "システムメッセージの取得に失敗しました。",
          variant: "destructive",
        })
      }
    }
    fetchSystemMessage()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/system_message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: systemMessage }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "更新に失敗しました")
      }
      toast({
        title: "更新完了",
        description: "システムメッセージが更新されました。",
      })
    } catch (err: any) {
      toast({
        title: "エラー",
        description: err.message || "システムメッセージの更新に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>システムメッセージ設定</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">システムメッセージ</label>
            <Textarea
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              className="h-48"
              placeholder="AIチャットボットのシステムメッセージを入力してください"
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                更新中...
              </>
            ) : (
              "更新"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

