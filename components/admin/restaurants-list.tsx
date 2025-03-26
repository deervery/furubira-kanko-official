"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2, GripVertical } from "lucide-react"
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

type Restaurant = {
  id: string
  name: string
  description: string
  image_path?: string
  icon: string
  url?: string
  display_order: number
}

const SortableRow = ({ restaurant, onEdit, onDelete }: { restaurant: Restaurant; onEdit: (restaurant: Restaurant) => void; onDelete: (id: string) => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: restaurant.id })

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
      <TableCell>{restaurant.name}</TableCell>
      <TableCell>{restaurant.description}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(restaurant)}>
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
                  この飲食店を削除してもよろしいですか？
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(restaurant.id)}>
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

export function RestaurantsList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("display_order", { ascending: true })

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error("Error fetching restaurants:", error)
      toast({
        title: "エラー",
        description: "飲食店の取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRestaurants()
  }, [])

  const handleEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant)
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("restaurants").delete().eq("id", id)
      if (error) throw error
      setRestaurants(restaurants.filter((restaurant) => restaurant.id !== id))
      toast({
        title: "成功",
        description: "飲食店を削除しました",
      })
    } catch (error) {
      console.error("Error deleting restaurant:", error)
      toast({
        title: "エラー",
        description: "飲食店の削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = restaurants.findIndex((restaurant) => restaurant.id === active.id)
    const newIndex = restaurants.findIndex((restaurant) => restaurant.id === over.id)

    const newRestaurants = arrayMove(restaurants, oldIndex, newIndex)
    setRestaurants(newRestaurants)

    // 表示順序を更新
    try {
      // 全てのアイテムのdisplay_orderを更新
      const updates = newRestaurants.map((restaurant, index) => ({
        id: restaurant.id,
        display_order: index,
        // 既存のデータを保持
        name: restaurant.name,
        description: restaurant.description,
        image_path: restaurant.image_path,
        icon: restaurant.icon,
        url: restaurant.url
      }))

      const { error } = await supabase.from("restaurants").upsert(updates)
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
        <h2 className="text-2xl font-bold">飲食店一覧</h2>
        <Button onClick={() => setEditingRestaurant({} as Restaurant)}>
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
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={restaurants.map((restaurant) => restaurant.id)} strategy={verticalListSortingStrategy}>
                  {restaurants.map((restaurant) => (
                    <SortableRow
                      key={restaurant.id}
                      restaurant={restaurant}
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

      {editingRestaurant && (
        <RestaurantForm
          restaurant={editingRestaurant}
          onClose={() => setEditingRestaurant(null)}
          onSave={() => {
            setEditingRestaurant(null)
            fetchRestaurants()
          }}
        />
      )}
    </div>
  )
}

