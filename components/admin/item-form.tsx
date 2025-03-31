"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, MapPin, Compass, Coffee, Utensils, BedDouble, Calendar, ShoppingBag } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import type { BaseItemType } from "@/lib/types"

interface ItemFormProps<T extends BaseItemType> {
  item: T | null
  onClose: (refreshData?: boolean) => void
  title: string
  tableName: string
  defaultIcon?: string
  storageFolder: string
  renderExtraFields?: ({
    item,
    register,
  }: {
    item: T | null
    register: <V>(value: V, setter: (value: V) => void) => {
      value: V
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    }
  }) => React.ReactNode
  nameField?: string
}

const iconOptions = [
  { value: "MapPin", label: "ピン", icon: <MapPin className="h-4 w-4" /> },
  { value: "Compass", label: "コンパス", icon: <Compass className="h-4 w-4" /> },
  { value: "Coffee", label: "コーヒー", icon: <Coffee className="h-4 w-4" /> },
  { value: "Utensils", label: "食事", icon: <Utensils className="h-4 w-4" /> },
  { value: "BedDouble", label: "宿泊", icon: <BedDouble className="h-4 w-4" /> },
  { value: "Calendar", label: "カレンダー", icon: <Calendar className="h-4 w-4" /> },
  { value: "ShoppingBag", label: "買い物", icon: <ShoppingBag className="h-4 w-4" /> },
]

export function ItemForm<T extends BaseItemType>({ 
  item,
  onClose,
  title,
  tableName,
  defaultIcon = "MapPin",
  storageFolder,
  renderExtraFields,
  nameField,
}: ItemFormProps<T>) {
  const [name, setName] = useState(item?.name || "")
  const [description, setDescription] = useState(item?.description || "")
  const [icon, setIcon] = useState(item?.icon || defaultIcon)
  const [image, setImage] = useState<File | null>(null)
  const [imagePath, setImagePath] = useState(item?.image_path || "")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [url, setUrl] = useState(item?.url || "")
  const { toast } = useToast()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (imagePath) {
      const imageUrl = supabase.storage.from("cms-images").getPublicUrl(imagePath).data.publicUrl
      setImagePreview(imageUrl)
    }
  }, [imagePath])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "エラー",
          description: "ファイルサイズは10MB以下にしてください",
          variant: "destructive",
        })
        return
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "エラー",
          description: "画像ファイルを選択してください",
          variant: "destructive",
        })
        return
      }
      
      setImage(file)
      const objectUrl = URL.createObjectURL(file)
      setImagePreview(objectUrl)
    }
  }

  const register = <T,>(value: T, setter: (value: T) => void) => ({
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setter(e.target.value as T)
  })

  const handleSubmit = async () => {
    if (!name || !description || !icon) {
      toast({
        title: "入力エラー",
        description: "名前、説明、アイコンは必須項目です",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let updatedImagePath = imagePath

      if (image) {
        try {
          const fileName = `${storageFolder}/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
          
          const { data, error: uploadError } = await supabase.storage
            .from("cms-images")
            .upload(fileName, image, {
              cacheControl: '3600',
              upsert: true
            })
    
          if (uploadError) throw uploadError
    
          if (item?.image_path && item.image_path !== fileName) {
            await supabase.storage.from("cms-images").remove([item.image_path])
          }
    
          updatedImagePath = fileName
        } catch (err) {
          console.error("画像処理エラー:", err)
          toast({
            title: "画像アップロードエラー",
            description: err instanceof Error ? err.message : "画像のアップロードに失敗しました",
            variant: "destructive",
          })
        }
      }

      const display_order = 0;
      const itemData = {
        name,
        description,
        icon,
        image_path: updatedImagePath,
        url,
        display_order: display_order,
        ...Object.fromEntries(
          Object.entries({ name, description, icon, image_path: updatedImagePath, url, display_order: display_order })
            .filter(([_, value]) => value !== undefined)
        )
      }

      if (item) {
        const { error } = await supabase.from(tableName).update(itemData).eq("id", item.id)
        if (error) throw error
        toast({
          title: "更新成功",
          description: `${title}を更新しました`,
        })
      } else {
        const { error } = await supabase.from(tableName).insert(itemData)
        if (error) throw error
        toast({
          title: "作成成功",
          description: `${title}を作成しました`,
        })
      }

      setOpen(false)
      onClose(true)
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message || "保存に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value)
      if (!value) onClose()
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? `${title}を編集` : `新規${title}`}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                {...register(name, setName)}
                placeholder={`${title}名`}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">アイコン *</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue placeholder="アイコンを選択" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center">
                        {option.icon}
                        <span className="ml-2">{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明 *</Label>
            <Textarea
              id="description"
              {...register(description, setDescription)}
              placeholder={`${title}の説明`}
              required
            />
          </div>

          {renderExtraFields && renderExtraFields({ item, register })}

          <div className="space-y-2">
            <Label htmlFor="url">詳細ページURL</Label>
            <Input
              id="url"
              {...register(url, setUrl)}
              placeholder="https://example.com/details"
            />
            <p className="text-xs text-muted-foreground">「詳しくはこちら」ボタンのリンク先URL</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">画像</Label>
            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" onClick={() => document.getElementById("image-upload")?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                画像をアップロード
              </Button>
              <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              <span className="text-sm text-gray-500">
                {image ? image.name : imagePath ? "現在の画像を使用" : "画像なし"}
              </span>
            </div>
            {imagePreview && (
              <div className="mt-2 relative w-full h-48">
                <Image
                  src={imagePreview}
                  alt="プレビュー"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/no_photo.jpg?height=200&width=300"
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 