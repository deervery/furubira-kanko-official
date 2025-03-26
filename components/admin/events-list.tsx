"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2, GripVertical } from "lucide-react"
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type Event = {
  id: string
  name: string
  description: string
  date: string
  image_path?: string
  icon: string
  url?: string
  display_order: number
}

const SortableRow = ({ event, onEdit, onDelete }: { event: Event; onEdit: (event: Event) => void; onDelete: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-gray-100" : ""}>
      <TableCell className="w-10">
        <button {...attributes} {...listeners} className="cursor-grab">
          <GripVertical className="h-4 w-4 text-gray-500" />
        </button>
      </TableCell>
      <TableCell>{event.name}</TableCell>
      <TableCell>{event.description}</TableCell>
      <TableCell>{event.date}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(event)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>削除の確認</AlertDialogTitle>
                <AlertDialogDescription>
                  このイベントを削除してもよろしいですか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(event.id)}>
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function EventsList() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("display_order", { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error("Error fetching events:", error)
      toast({
        title: "エラー",
        description: "イベントの取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("events").delete().eq("id", id)
      if (error) throw error
      setEvents(events.filter((event) => event.id !== id))
      toast({
        title: "成功",
        description: "イベントを削除しました",
      })
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({
        title: "エラー",
        description: "イベントの削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = events.findIndex((event) => event.id === active.id)
    const newIndex = events.findIndex((event) => event.id === over.id)

    const newEvents = arrayMove(events, oldIndex, newIndex)
    setEvents(newEvents)

    // 表示順序を更新
    try {
      // 全てのアイテムのdisplay_orderを更新
      const updates = newEvents.map((event, index) => ({
        id: event.id,
        display_order: index,
        // 既存のデータを保持
        name: event.name,
        description: event.description,
        date: event.date,
        image_path: event.image_path,
        icon: event.icon,
        url: event.url
      }))

      const { error } = await supabase.from("events").upsert(updates)
      if (error) throw error

      toast({
        title: "成功",
        description: "表示順序を更新しました",
      })
    } catch (error) {
      console.error("Error updating display order:", error)
      toast({
        title: "エラー",
        description: "表示順序の更新に失敗しました",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">イベント一覧</h2>
        <Button onClick={() => setEditingEvent({} as Event)}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={events.map((event) => event.id)} strategy={verticalListSortingStrategy}>
                  {events.map((event) => (
                    <SortableRow
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </CardContent>
      </Card>

      {editingEvent && (
        <EventForm
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={() => {
            setEditingEvent(null)
            fetchEvents()
          }}
        />
      )}
    </div>
  )
}

