import type React from "react"
import { Header } from "@/components/ui/header"
import { Footer } from "@/components/ui/footer"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[url('/washi_background.webp')]">
      <Header />
      <main className="pt-24 pb-8 px-8">{children}</main>
      <Footer />
    </div>
  )
}

