"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { RestaurantForm } from "@/components/admin/restaurant-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type Restaurant = {
  id: string
  name: string
  description: string
  image_path?: string
  icon: string
}

export function RestaurantsList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const { toast } = useToast()

  const fetchRestaurants = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("restaurants").select("*").order("name")

      if (error) throw error

      setRestaurants(data || [])
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "飲食店の取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("restaurants").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "削除成功",
        description: "飲食店を削除しました",
      })

      fetchRestaurants()
    } catch (error: any) {
      toast({
        title: "削除エラー",
        description: error.message || "飲食店の削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = (refreshData = false) => {
    setIsFormOpen(false)
    setEditingRestaurant(null)
    if (refreshData) {
      fetchRestaurants()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">飲食店管理</h2>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      飲食店がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  restaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">{restaurant.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{restaurant.description}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(restaurant)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                                <AlertDialogDescription>
                                  この操作は元に戻せません。「{restaurant.name}」を削除します。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(restaurant.id)}>削除</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isFormOpen && <RestaurantForm restaurant={editingRestaurant} onClose={handleFormClose} />}
    </div>
  )
}

