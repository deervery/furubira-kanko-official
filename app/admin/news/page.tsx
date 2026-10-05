"use client"
import { useCallback, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { canEditNews, newsInput, newsText, type NewsInput, type NewsItem } from "@/lib/news"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const emptyNews = (): NewsInput => ({ title: "", body: "", title_en: "", body_en: "", published_on: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date()), is_published: false })
export default function NewsAdminPage() {
  const { user } = useAuth()
  const allowed = canEditNews(user)
  const [items, setItems] = useState<NewsItem[]>([])
  const [draft, setDraft] = useState<NewsInput>(emptyNews)
  const [editing, setEditing] = useState<NewsItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState("")
  const [preview, setPreview] = useState(false)
  const load = useCallback(async () => {
    setLoaded(false)
    try {
      const { data, error } = await supabase.from("news").select("*").order("published_on", { ascending: false }).order("id", { ascending: false }).limit(100)
      if (error) throw error
      setItems(data as NewsItem[])
      setLoaded(true)
    } catch { setMessage("一覧を取得できません。接続・ニューステーブル・編集権限を確認して再読み込みしてください。") }
  }, [])
  useEffect(() => { if (allowed) void load() }, [allowed, load])
  async function save(event: FormEvent) {
    event.preventDefault()
    const parsed = newsInput.safeParse(draft)
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return }
    setBusy(true); setMessage("")
    try {
      const query = editing
        ? supabase.from("news").update(parsed.data).eq("id", editing.id).eq("updated_at", editing.updated_at)
        : supabase.from("news").insert(parsed.data)
      const { data, error } = await query.select("id")
      if (error) throw error
      if (!data?.length) { setMessage("他の人が更新した可能性があります。一覧を再読み込みして編集し直してください。入力内容は保持しています。"); return }
      setEditing(null); setDraft(emptyNews()); setPreview(false)
      await load()
      setMessage(parsed.data.is_published ? "公開として保存しました。公開ページを確認してください。" : "下書きとして保存しました。公開ページには表示されません。")
    } catch { setMessage("保存できませんでした。接続・編集権限を確認してください。入力内容は保持しています。") }
    finally { setBusy(false) }
  }
  if (!allowed) return <p className="px-4" role="alert">お知らせの編集権限がありません。管理者に権限付与を依頼し、再ログインしてください。</p>
  return <div className="max-w-4xl mx-auto px-4 space-y-8">
    <Link href="/admin/dashboard" className="underline">管理ダッシュボードへ</Link>
    <h1 className="text-3xl font-bold">お知らせ管理</h1>
    <p>日付は表示・並び順用です。公開にチェックして保存すると、未来の日付でもすぐに公開されます。</p>
    {message && <p role="status" className="rounded border p-4">{message}</p>}
    <form onSubmit={save} className="space-y-4 rounded border bg-white p-6">
      <h2 className="text-xl font-semibold">{editing ? "お知らせを編集" : "お知らせを新規作成"}</h2>
      <fieldset disabled={busy} className="space-y-4">
        <div><Label htmlFor="title">タイトル（日本語・必須）</Label><Input id="title" required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
        <div><Label htmlFor="body">本文（日本語・必須）</Label><Textarea id="body" required maxLength={20000} rows={10} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /><p className="text-sm text-gray-600">改行をそのまま表示します。HTMLは使用できません。</p></div>
        <div><Label htmlFor="published-on">表示日（必須）</Label><Input id="published-on" type="date" required value={draft.published_on} onChange={e => setDraft({ ...draft, published_on: e.target.value })} /></div>
        <details><summary className="cursor-pointer">英語版（任意・未入力なら日本語を表示）</summary><div className="space-y-4 mt-4">
          <div><Label htmlFor="title-en">Title</Label><Input id="title-en" maxLength={200} value={draft.title_en} onChange={e => setDraft({ ...draft, title_en: e.target.value })} /></div>
          <div><Label htmlFor="body-en">Body</Label><Textarea id="body-en" rows={8} maxLength={20000} value={draft.body_en} onChange={e => setDraft({ ...draft, body_en: e.target.value })} /></div>
        </div></details>
        <label className="flex items-center gap-3"><input type="checkbox" checked={draft.is_published} onChange={e => setDraft({ ...draft, is_published: e.target.checked })} />公開する（外して保存すると非公開になります）</label>
        <div className="flex flex-wrap gap-3"><Button type="submit">{busy ? "保存中…" : "保存"}</Button><Button type="button" variant="outline" onClick={() => setPreview(!preview)}>プレビュー</Button><Button type="button" variant="ghost" onClick={() => { setEditing(null); setDraft(emptyNews()); setPreview(false); setMessage("") }}>編集を終了・新規作成</Button></div>
      </fieldset>
    </form>
    {preview && <section className="border bg-white p-6 space-y-6" aria-label="保存前プレビュー">{["ja", "en"].map(lang => { const text = newsText(draft, lang); return <article key={lang} lang={text.lang}><p>{lang === "ja" ? "日本語" : "English"} · {draft.published_on}</p><h2 className="font-bold text-2xl my-3 break-words">{text.title}</h2><p className="whitespace-pre-wrap break-words">{text.body}</p></article> })}</section>}
    <section><h2 className="text-xl font-semibold">登録済みのお知らせ（最新100件）</h2><Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>一覧を再読み込み</Button>
      {!loaded ? <p>一覧の読み込み待ちです。</p> : !items.length ? <p>登録はありません。</p> : <ul className="divide-y">{items.map(item => <li key={item.id} className="py-4 space-y-2"><p className="break-words">{item.is_published ? "公開" : "下書き"} · {item.published_on} · {item.title}</p><Button disabled={busy} variant="outline" onClick={() => { setEditing(item); setDraft({ title: item.title, body: item.body, title_en: item.title_en, body_en: item.body_en, published_on: item.published_on, is_published: item.is_published }); setMessage(""); setPreview(false); window.scrollTo({ top: 0, behavior: "smooth" }) }}>編集</Button>{item.is_published && <Link href={`/ja/news/${item.id}`} target="_blank" rel="noopener noreferrer" className="ml-4 underline">公開ページを見る</Link>}</li>)}</ul>}
    </section>
  </div>
}
