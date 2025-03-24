"use client"

import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminHeader } from "@/components/admin/admin-header"
import { SpotsList } from "@/components/admin/spots-list"
import { RestaurantsList } from "@/components/admin/restaurants-list"
import { AccommodationsList } from "@/components/admin/accommodations-list"
import { EventsList } from "@/components/admin/events-list"
import { ShopsList } from "@/components/admin/shops-list"
import { TourCategoriesList } from "@/components/admin/tour-categories-list"
import { SystemMessageForm } from "@/components/admin/system-message-form"

export default function AdminDashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />

      <main className="container mx-auto py-6 px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>管理者ダッシュボード</CardTitle>
            <CardDescription>古平町観光協会のウェブサイトコンテンツを管理します</CardDescription>
          </CardHeader>
          <CardContent>
            <p>ログイン中: {user?.email}</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="spots">
          <TabsList className="mb-4">
            <TabsTrigger value="spots">観光スポット</TabsTrigger>
            <TabsTrigger value="restaurants">飲食店</TabsTrigger>
            <TabsTrigger value="accommodations">宿泊施設</TabsTrigger>
            <TabsTrigger value="events">イベント</TabsTrigger>
            <TabsTrigger value="shops">買い物</TabsTrigger>
            <TabsTrigger value="tour-categories">ツアーカテゴリ</TabsTrigger>
            <TabsTrigger value="system-message">システムメッセージ</TabsTrigger>
          </TabsList>

          <TabsContent value="spots">
            <SpotsList />
          </TabsContent>

          <TabsContent value="restaurants">
            <RestaurantsList />
          </TabsContent>

          <TabsContent value="accommodations">
            <AccommodationsList />
          </TabsContent>

          <TabsContent value="events">
            <EventsList />
          </TabsContent>

          <TabsContent value="shops">
            <ShopsList />
          </TabsContent>

          <TabsContent value="tour-categories">
            <TourCategoriesList />
          </TabsContent>

          <TabsContent value="system-message">
            <SystemMessageForm />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

