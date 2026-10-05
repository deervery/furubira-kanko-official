"use client"
import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === "/admin/news") return <main className="min-h-screen bg-gray-50">{children}</main>
  return <main className="max-w-3xl mx-auto px-4 py-16 space-y-4"><h1 className="text-2xl font-bold">コンテンツの更新</h1><p>観光情報はGit管理の静的データから配信しています。旧データベースCMSは現在の公開データを更新しません。</p><Link href="/admin/news" className="underline">お知らせ編集へ</Link><p><a href="https://github.com/deervery/furubira-kanko-official" className="underline">その他の観光情報はGitHubで編集</a></p></main>
}
