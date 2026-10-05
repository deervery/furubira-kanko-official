"use client"
import { useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { newsInput, newsCollection, newsText, upsertNews, type NewsInput, type NewsItem } from "@/lib/news"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const sourceUrl = "https://github.com/deervery/furubira-kanko-official/edit/main/content/news.json"
const emptyNews = (): NewsInput => ({ id: "", title: "", body: "", title_en: "", body_en: "", published_on: new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date()) })
export default function NewsEditorPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [draft, setDraft] = useState<NewsInput>(emptyNews)
  const [editingId, setEditingId] = useState<string>()
  const [loaded, setLoaded] = useState(false)
  const [message, setMessage] = useState("")
  const [preview, setPreview] = useState(false)
  const [changed, setChanged] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/news", { cache: "no-store", signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error()
      return response.json()
    }).then(data => { setItems(newsCollection.parse(data)); setLoaded(true) })
      .catch(() => { if (!controller.signal.aborted) setMessage("公開データを読み込めません。再読み込みするか、GitHubの最新news.jsonを読み込んでください。") })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!changed) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [changed])
  function save(event: FormEvent) {
    event.preventDefault()
    const parsed = newsInput.safeParse(draft)
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return }
    try {
      setItems(upsertNews(items, parsed.data, editingId)); setChanged(true)
      setEditingId(undefined); setDraft(emptyNews()); setPreview(false); setFormDirty(false)
      setMessage("編集内容をこの画面の一覧に追加しました。まだ公開されていません。JSONを書き出し、GitHubで変更をPRにしてください。")
    } catch (error) { setMessage(error instanceof Error ? error.message : "入力を確認してください。") }
  }
  function download() {
    if (formDirty) { setMessage("入力中の原稿があります。先に「編集内容を一覧へ追加」してください。"); return }
    const file = new Blob([JSON.stringify(newsCollection.parse(items), null, 2) + "\n"], { type: "application/json" })
    const url = URL.createObjectURL(file)
    const link = document.createElement("a"); link.href = url; link.download = "news.json"; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setChanged(false)
    setMessage("news.jsonを書き出しました。ファイル内は公開予定の全記事です。GitHubの最新版との差分を確認し、新しいブランチでPRを作成してください。")
  }
  return <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
    <Link href="/ja" className="underline">サイトへ</Link>
    <h1 className="text-3xl font-bold">お知らせ編集</h1>
    <p>この画面では原稿を作成し、news.jsonを書き出します。公開にはGitHubへの登録・PRレビュー・デプロイが必要です。サーバーへの保存機能はありません。</p>
    <p className="text-sm text-gray-600">作成途中の原稿はこのタブ内のみで保持します。閉じる前に一覧へ追加し、JSONを書き出してください。公開リポジトリに登録した原稿は、PR段階から第三者が読めます。</p>
    {message && <p role="status" className="rounded border p-4">{message}</p>}
    <section className="space-y-3 rounded border p-4"><Label htmlFor="import-news">最新版のnews.jsonを読み込む（任意・現在の一覧を置換）</Label><Input id="import-news" type="file" accept="application/json,.json" onChange={async event => {
      const file = event.target.files?.[0]
      if (!file) return
      if (changed && !window.confirm("この画面の編集内容を置き換えます。先にJSONを書き出しましたか？")) return
      try {
        if (file.size > 25_000_000) throw new Error("ファイルが大きすぎます")
        setItems(newsCollection.parse(JSON.parse(await file.text()))); setLoaded(true); setChanged(true); setEditingId(undefined); setDraft(emptyNews()); setFormDirty(false); setMessage("ファイルを読み込みました。公開はされていません。")
      } catch { setMessage("news.jsonの形式を確認してください。元の一覧は保持しています。") }
      event.target.value = ""
    }} /></section>
    <form onSubmit={save} className="space-y-4 rounded border bg-white p-6">
      <h2 className="text-xl font-semibold">{editingId ? "原稿を編集" : "原稿を新規作成"}</h2>
      <fieldset disabled={!loaded} className="space-y-4" onChange={() => { setChanged(true); setFormDirty(true) }}>
        <div><Label htmlFor="news-id">記事ID（必須・URLに使用）</Label><Input id="news-id" required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="2026-10-05-announcement" value={draft.id} onChange={e => setDraft({ ...draft, id: e.target.value })} /></div>
        <div><Label htmlFor="title">タイトル（日本語・必須）</Label><Input id="title" required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
        <div><Label htmlFor="body">本文（日本語・必須）</Label><Textarea id="body" required maxLength={20000} rows={10} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /><p className="text-sm text-gray-600">改行をそのまま表示します。HTMLは使用できません。</p></div>
        <div><Label htmlFor="published-on">表示日（必須・予約公開機能ではありません）</Label><Input id="published-on" type="date" required value={draft.published_on} onChange={e => setDraft({ ...draft, published_on: e.target.value })} /></div>
        <details><summary className="cursor-pointer">英語版（任意・未入力なら日本語を表示）</summary><div className="space-y-4 mt-4">
          <div><Label htmlFor="title-en">Title</Label><Input id="title-en" maxLength={200} value={draft.title_en} onChange={e => setDraft({ ...draft, title_en: e.target.value })} /></div>
          <div><Label htmlFor="body-en">Body</Label><Textarea id="body-en" rows={8} maxLength={20000} value={draft.body_en} onChange={e => setDraft({ ...draft, body_en: e.target.value })} /></div>
        </div></details>
        <div className="flex flex-wrap gap-3"><Button type="submit">編集内容を一覧へ追加</Button><Button type="button" variant="outline" onClick={() => setPreview(!preview)}>プレビュー</Button><Button type="button" variant="ghost" onClick={() => { if (formDirty && !window.confirm("入力中の原稿を破棄しますか？")) return; setEditingId(undefined); setDraft(emptyNews()); setPreview(false); setFormDirty(false) }}>入力をクリア</Button></div>
      </fieldset>
    </form>
    {preview && <section className="border bg-white p-6 space-y-6" aria-label="原稿プレビュー">{["ja", "en"].map(lang => { const text = newsText(draft, lang); return <article key={lang} lang={text.lang}><p>{lang === "ja" ? "日本語" : "English"} · {draft.published_on}</p><h2 className="font-bold text-2xl my-3 break-words">{text.title}</h2><p className="whitespace-pre-wrap break-words">{text.body}</p></article> })}</section>}
    <section className="space-y-4"><h2 className="text-xl font-semibold">書き出す記事一覧</h2>
      {!loaded ? <p>公開データの読み込み待ちです。</p> : !items.length ? <p>記事はありません。</p> : <ul className="divide-y">{items.map(item => <li key={item.id} className="py-4 space-y-2"><p className="break-words">{item.published_on} · {item.title}</p><Button variant="outline" onClick={() => { if (formDirty && !window.confirm("入力中の原稿を破棄してこの記事を編集しますか？")) return; setEditingId(item.id); setDraft(item); setFormDirty(false); setMessage(""); setPreview(false); window.scrollTo({ top: 0, behavior: "smooth" }) }}>編集</Button><Button variant="ghost" onClick={() => { if (window.confirm("書き出し一覧から外しますか？公開サイトから削除するにはPRとデプロイが必要です。")) { setItems(items.filter(i => i.id !== item.id)); setChanged(true) } }}>一覧から外す</Button></li>)}</ul>}
      <div className="flex flex-wrap gap-3"><Button disabled={!loaded} onClick={download}>news.jsonを書き出す</Button><a className="underline p-2" href={sourceUrl} target="_blank" rel="noopener noreferrer">GitHubで登録（新しいブランチ・PR）</a></div>
    </section>
  </div>
}
