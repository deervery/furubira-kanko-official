"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-provider"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, user } = useAuth()
  const pathname = usePathname()

  // ログインページは別レイアウトを使用
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">読み込み中...</span>
      </div>
    )
  }

  if (!user) {
    return null // AuthProviderがリダイレクトを処理するため
  }

  return <>{children}</>
}

