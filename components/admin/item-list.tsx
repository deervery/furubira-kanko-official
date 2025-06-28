"use client"
"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Trash2, GripVertical } from "lucide-react"
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
import type { BaseItemType } from "@/lib/types"

interface ItemsListProps<T extends BaseItemType> {
  title: string
  tableName: string
  FormComponent: React.ComponentType<{ item: T | null; onClose: () => void }>
  renderExtraColumns?: (item: T) => React.ReactNode
  orderByField?: string
}

interface SortableItemProps {
  id: string
  children: React.ReactNode
}

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell>
        <Button variant="ghost" size="icon" {...listeners}>
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  )
}

export function ItemsList<T extends BaseItemType>({ 
  title,
  tableName,
  FormComponent,
  renderExtraColumns,
  orderByField = "display_order"
}: ItemsListProps<T>) {
  const [showForm, setShowForm] = useState(false)
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const fetchItems = async () => {
    try {
      const q = query(
        collection(db, tableName),
        orderBy(orderByField, "asc")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      
      setItems(data || [])
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error)
      toast({
        title: "エラー",
        description: `${title}の取得に失敗しました`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleCloseForm = (refreshData?: boolean) => {
    setShowForm(false)
    setSelectedItem(null)
    if (refreshData) {
      fetchItems()
    }
  }

  const handleCreateNew = () => {
    setSelectedItem(null)
    setShowForm(true)
  }

  const handleEdit = (item: T) => {
    setSelectedItem(item)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, tableName, id);
      await deleteDoc(docRef);
      setItems(items.filter((item) => item.id !== id))
      toast({
        title: "成功",
        description: `${title}を削除しました`,
      })
    } catch (error) {
      console.error(`Error deleting ${tableName}:`, error)
      toast({
        title: "エラー",
        description: `${title}の削除に失敗しました`,
        variant: "destructive",
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)

    const newItems = arrayMove(items, oldIndex, newIndex)
    setItems(newItems)

    try {
      const batch = writeBatch(db);
      
      newItems.forEach((item, index) => {
        const docRef = doc(db, tableName, item.id);
        batch.update(docRef, { display_order: index });
      });
      
      await batch.commit();

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
    <Card>
      {showForm ? (
        <FormComponent 
          item={selectedItem}
          onClose={handleCloseForm}
        />
      ) : (
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{title}管理</h2>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              新規作成
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: 50 }}></TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>説明</TableHead>
                  {renderExtraColumns && <TableHead>追加情報</TableHead>}
                  <TableHead style={{ width: 100 }}>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                  {items.map((item) => (
                    <SortableItem key={item.id} id={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      {renderExtraColumns && renderExtraColumns(item)}
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                          >
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
                                  本当に「{item.name}」を削除しますか？この操作は取り消せません。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)}>
                                  削除
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </SortableItem>
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </CardContent>
      )}
    </Card>
  )
} 