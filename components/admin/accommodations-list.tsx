"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { AccommodationForm } from "@/components/admin/accommodation-form"
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

type Accommodation = {
  id: string
  name: string
  description: string
  image_path?: string
  icon: string
}

export function AccommodationsList() {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null)
  const { toast } = useToast()

  const fetchAccommodations = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("accommodations").select("*").order("name")

      if (error) throw error

      setAccommodations(data || [])
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "宿泊施設の取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccommodations()
  }, [])

  const handleEdit = (accommodation: Accommodation) => {
    setEditingAccommodation(accommodation)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("accommodations").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "削除成功",
        description: "宿泊施設を削除しました",
      })

      fetchAccommodations()
    } catch (error: any) {
      toast({
        title: "削除エラー",
        description: error.message || "宿泊施設の削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = (refreshData = false) => {
    setIsFormOpen(false)
    setEditingAccommodation(null)
    if (refreshData) {
      fetchAccommodations()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">宿泊施設管理</h2>
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
                {accommodations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      宿泊施設がありません
                    </TableCell>
                  </TableRow>
                ) : (
                  accommodations.map((accommodation) => (
                    <TableRow key={accommodation.id}>
                      <TableCell className="font-medium">{accommodation.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{accommodation.description}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(accommodation)}>
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
                                  この操作は元に戻せません。「{accommodation.name}」を削除します。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(accommodation.id)}>
                                  削除
                                </AlertDialogAction>
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

      {isFormOpen && <AccommodationForm accommodation={editingAccommodation} onClose={handleFormClose} />}
    </div>
  )
}

