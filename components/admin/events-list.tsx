"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { EventForm } from "@/components/admin/event-form"
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

type Event = {
  id: string
  name: string
  description: string
  date: string
  image_path?: string
  icon: string
}

export function EventsList() {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const { toast } = useToast()

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("events").select("*").order("name")

      if (error) throw error

      setEvents(data || [])
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "イベントの取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("events").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "削除成功",
        description: "イベントを削除しました",
      })

      fetchEvents()
    } catch (error: any) {
      toast({
        title: "削除エラー",
        description: error.message || "イベントの削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = (refreshData = false) => {
    setIsFormOpen(false)
    setEditingEvent(null)
    if (refreshData) {
      fetchEvents()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">イベント管理</h2>
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
                  <TableHead>開催日</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      イベントがありません
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{event.description}</TableCell>
                      <TableCell>{event.date}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
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
                                  この操作は元に戻せません。「{event.name}」を削除します。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(event.id)}>削除</AlertDialogAction>
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

      {isFormOpen && <EventForm event={editingEvent} onClose={handleFormClose} />}
    </div>
  )
}

