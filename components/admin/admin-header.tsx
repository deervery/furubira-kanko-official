"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { LogOut, Home } from "lucide-react"

export function AdminHeader() {
  const { signOut } = useAuth()

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/dashboard" className="font-bold text-xl">
            古平町観光協会 CMS
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              サイトを表示
            </Button>
          </Link>

          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </div>
      </div>
    </header>
  )
}

