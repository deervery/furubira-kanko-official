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

// 既存のimportとtype定義はそのまま

// Spotタイプにurlフィールドを追加
type Spot = {
  id: string
  name: string
  description: string
  address?: string
  facilities?: string
  image_path?: string
  icon: string
  url?: string
}

type SpotFormProps = {
  spot: Spot | null
  onClose: (refreshData?: boolean) => void
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

export function SpotForm({ spot, onClose }: SpotFormProps) {
  const [name, setName] = useState(spot?.name || "")
  const [description, setDescription] = useState(spot?.description || "")
  const [address, setAddress] = useState(spot?.address || "")
  const [facilities, setFacilities] = useState(spot?.facilities || "")
  const [icon, setIcon] = useState(spot?.icon || "MapPin")
  const [image, setImage] = useState<File | null>(null)
  const [imagePath, setImagePath] = useState(spot?.image_path || "")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // SpotFormコンポーネント内で、useState部分に以下を追加
  const [url, setUrl] = useState(spot?.url || "")

  useEffect(() => {
    if (imagePath) {
      // Supabase Storageから画像のURLを取得
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

      // 画像がアップロードされた場合
      if (image) {
        try {
          const fileName = `spots/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, '_')}` // ファイル名を安全に
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
          if (spot?.image_path && spot.image_path !== fileName) {
            const { error: deleteError } = await supabase.storage
              .from("cms-images")
              .remove([spot.image_path])
            
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

      // handleSubmit関数内のspotDataオブジェクトにurlを追加
      const spotData = {
        name,
        description,
        address,
        facilities,
        icon,
        image_path: updatedImagePath,
        url,
      }

      if (spot) {
        // 更新
        const { error } = await supabase.from("spots").update(spotData).eq("id", spot.id)

        if (error) throw error

        toast({
          title: "更新成功",
          description: "観光スポットを更新しました",
        })
      } else {
        // 新規作成
        const { error } = await supabase.from("spots").insert(spotData)

        if (error) throw error

        toast({
          title: "作成成功",
          description: "観光スポットを作成しました",
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
          <DialogTitle>{spot ? "観光スポットを編集" : "新規観光スポット"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">名前 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="観光スポット名"
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
              placeholder="観光スポットの説明"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">住所</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="住所" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facilities">施設情報</Label>
            <Input
              id="facilities"
              value={facilities}
              onChange={(e) => setFacilities(e.target.value)}
              placeholder="施設情報（駐車場、トイレなど）"
            />
          </div>

          {/* フォームのフィールド部分に以下を追加（facilities入力フィールドの後に配置） */}
          <div className="space-y-2">
            <Label htmlFor="url">詳細ページURL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/spot-details"
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
