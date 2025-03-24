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

type Event = {
  id: string
  name: string
  description: string
  date: string
  image_path?: string
  icon: string
  url?: string
}

type EventFormProps = {
  event: Event | null
  onClose: (refreshData?: boolean) => void
}

const iconOptions = [
  { value: "Calendar", label: "カレンダー", icon: <Calendar className="h-4 w-4" /> },
  { value: "MapPin", label: "ピン", icon: <MapPin className="h-4 w-4" /> },
  { value: "Compass", label: "コンパス", icon: <Compass className="h-4 w-4" /> },
  { value: "Coffee", label: "コーヒー", icon: <Coffee className="h-4 w-4" /> },
  { value: "Utensils", label: "食事", icon: <Utensils className="h-4 w-4" /> },
  { value: "BedDouble", label: "宿泊", icon: <BedDouble className="h-4 w-4" /> },
  { value: "ShoppingBag", label: "買い物", icon: <ShoppingBag className="h-4 w-4" /> },
]

export function EventForm({ event, onClose }: EventFormProps) {
  const [name, setName] = useState(event?.name || "")
  const [description, setDescription] = useState(event?.description || "")
  const [date, setDate] = useState(event?.date || "")
  const [icon, setIcon] = useState(event?.icon || "Calendar")
  const [image, setImage] = useState<File | null>(null)
  const [imagePath, setImagePath] = useState(event?.image_path || "")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const [url, setUrl] = useState(event?.url || "")

  useEffect(() => {
    if (imagePath) {
      const imageUrl = supabase.storage.from("cms-images").getPublicUrl(imagePath).data.publicUrl
      setImagePreview(imageUrl)
    }
  }, [imagePath])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // ファイルサイズチェック (10MB以下)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "エラー",
          description: "ファイルサイズは10MB以下にしてください",
          variant: "destructive",
        })
        return
      }
      
      // 画像ファイル形式チェック
      if (!file.type.startsWith('image/')) {
        toast({
          title: "エラー",
          description: "画像ファイルを選択してください",
          variant: "destructive",
        })
        return
      }
      
      setImage(file)
      // オブジェクトURLを作成して画像プレビューを設定
      const objectUrl = URL.createObjectURL(file)
      setImagePreview(objectUrl)
      
      // コンソールにログを出力（デバッグ用）
      console.log("画像が選択されました:", file.name, file.type, file.size)
    }
  }

  const handleSubmit = async () => {
    if (!name || !description || !date || !icon) {
      toast({
        title: "入力エラー",
        description: "名前、説明、開催日、アイコンは必須項目です",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      let updatedImagePath = imagePath

      // 画像がアップロードされた場合
      if (image) {
        try {
          const fileName = `events/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, '_')}` // ファイル名を安全に
          console.log("画像アップロード開始:", fileName)
          
          const { data, error: uploadError } = await supabase.storage
            .from("cms-images")
            .upload(fileName, image, {
              cacheControl: '3600',
              upsert: true
            })
    
          if (uploadError) {
            console.error("画像アップロードエラー:", uploadError)
            throw uploadError
          }
          
          console.log("画像アップロード成功:", data)
    
          // 古い画像を削除（更新の場合）
          if (event?.image_path && event.image_path !== fileName) {
            const { error: deleteError } = await supabase.storage
              .from("cms-images")
              .remove([event.image_path])
            
            if (deleteError) {
              console.warn("古い画像の削除に失敗:", deleteError)
            }
          }
    
          updatedImagePath = fileName
        } catch (err) {
          console.error("画像処理エラー:", err)
          toast({
            title: "画像アップロードエラー",
            description: err instanceof Error ? err.message : "画像のアップロードに失敗しました",
            variant: "destructive",
          })
          // 画像アップロードに失敗しても処理を続行
        }
      }

      const eventData = {
        name,
        description,
        date,
        icon,
        image_path: updatedImagePath,
        url,
      }

      if (event) {
        // 更新
        const { error } = await supabase.from("events").update(eventData).eq("id", event.id)

        if (error) throw error

        toast({
          title: "更新成功",
          description: "イベントを更新しました",
        })
      } else {
        // 新規作成
        const { error } = await supabase.from("events").insert(eventData)

        if (error) throw error

        toast({
          title: "作成成功",
          description: "イベントを作成しました",
        })
      }

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
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event ? "イベントを編集" : "新規イベント"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="イベント名"
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="イベントの説明"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">開催日 *</Label>
            <Input
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="例: 7月・9月開催"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">詳細ページURL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/event-details"
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
                    target.src = "/setakamuy.png?height=200&width=300"
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            キャンセル
          </Button>
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
