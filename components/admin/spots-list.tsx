"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { SpotForm } from "@/components/admin/spot-form"
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

type Spot = {
  id: string
  name: string
  description: string
  address?: string
  facilities?: string
  image_path?: string
  icon: string
}

export function SpotsList() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null)
  const { toast } = useToast()

  const fetchSpots = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("spots").select("*").order("name")

      if (error) throw error

      setSpots(data || [])
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "観光スポットの取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSpots()
  }, [])

  const handleEdit = (spot: Spot) => {
    setEditingSpot(spot)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("spots").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "削除成功",
        description: "観光スポットを削除しました",
      })

      fetchSpots()
    } catch (error: any) {
      toast({
        title: "削除エラー",
        description: error.message || "観光スポットの削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = (refreshData = false) => {
    setIsFormOpen(false)
    setEditingSpot(null)
    if (refreshData) {
      fetchSpots()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">観光スポット管理</h2>
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
                  <TableHead>住所</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      観光スポットがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  spots.map((spot) => (
                    <TableRow key={spot.id}>
                      <TableCell className="font-medium">{spot.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{spot.description}</TableCell>
                      <TableCell>{spot.address || "-"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(spot)}>
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
                                  この操作は元に戻せません。「{spot.name}」を削除します。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(spot.id)}>削除</AlertDialogAction>
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

      {isFormOpen && <SpotForm spot={editingSpot} onClose={handleFormClose} />}
    </div>
  )
}

