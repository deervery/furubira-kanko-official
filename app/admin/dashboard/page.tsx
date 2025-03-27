"use client"

import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { MapPin, Coffee, BedDouble, ShoppingBag, Calendar, ListTodo } from "lucide-react"

const adminLinks = [
  { href: "/admin/spots", icon: MapPin, text: "観光スポット管理" },
  { href: "/admin/restaurants", icon: Coffee, text: "飲食店管理" },
  { href: "/admin/accommodations", icon: BedDouble, text: "宿泊施設管理" },
  { href: "/admin/shops", icon: ShoppingBag, text: "買い物管理" },
  { href: "/admin/events", icon: Calendar, text: "イベント管理" },
  { href: "/admin/tour-categories", icon: ListTodo, text: "ツアーカテゴリ管理" },
]

export default function AdminDashboard() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">管理ダッシュボード</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:bg-gray-50 transition-colors">
              <CardContent className="flex items-center gap-4 p-6">
                <link.icon className="h-6 w-6" />
                <span className="text-lg font-medium">{link.text}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

