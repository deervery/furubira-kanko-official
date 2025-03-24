"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

type TourCategory = {
  id: string
  key: string
  title: string
  time_range: string
}

type TourCategoryFormProps = {
  category: TourCategory | null
  onClose: (refreshData?: boolean) => void
}

export function TourCategoryForm({ category, onClose }: TourCategoryFormProps) {
  const [key, setKey] = useState(category?.key || "")
  const [title, setTitle] = useState(category?.title || "")
  const [timeRange, setTimeRange] = useState(category?.time_range || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!key || !title || !timeRange) {
      toast({
        title: "入力エラー",
        description: "キー、タイトル、時間帯は必須項目です",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const categoryData = {
        key,
        title,
        time_range: timeRange,
      }

      if (category) {
        // 更新
        const { error } = await supabase.from("tour_categories").update(categoryData).eq("id", category.id)

        if (error) throw error

        toast({
          title: "更新成功",
          description: "ツアーカテゴリを更新しました",
        })
      } else {
        // 新規作成
        const { error } = await supabase.from("tour_categories").insert(categoryData)

        if (error) throw error

        toast({
          title: "作成成功",
          description: "ツアーカテゴリを作成しました",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "ツアーカテゴリを編集" : "新規ツアーカテゴリ"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="key">キー *</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="例: spots, dining"
              required
              disabled={!!category} // 既存カテゴリの場合はキーを変更不可
            />
            {!!category && <p className="text-xs text-muted-foreground">既存のカテゴリのキーは変更できません</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">タイトル *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 古平の自然と文化に触れる"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeRange">時間帯 *</Label>
            <Input
              id="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              placeholder="例: 温泉しおかぜでゆったりと"
              required
            />
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

