import { newsInput, newsCollection, newsText, upsertNews } from "./news.mjs"
const editor = document.querySelector("[data-news-editor]")
if (editor) {
  const form = editor.querySelector("form"), fieldset = form.querySelector("fieldset")
  const fields = { id:"news-id", title:"title", body:"body", title_en:"title-en", body_en:"body-en", published_on:"published-on" }
  const input = key => document.getElementById(fields[key])
  const today = () => new Intl.DateTimeFormat("sv-SE", {timeZone:"Asia/Tokyo"}).format(new Date())
  const blank = () => ({id:"",title:"",body:"",title_en:"",body_en:"",published_on:today()})
  const initial = document.getElementById("news-source")
  let items = newsCollection.parse(JSON.parse(initial.textContent))
  let editingId, changed = false, dirty = false, showingPreview = false, preview, status
  const listSection = [...editor.querySelectorAll("section")].find(section=>section.querySelector("h2")?.textContent==="書き出す記事一覧")
  const publication = editor.querySelector('[aria-label="お知らせを公開するまで"]') || editor.querySelector("#publication-flow-heading").closest("section")
  function el(tag,text,className) { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(className)n.className=className; return n }
  function message(value) { status?.remove();status=null;if(value){status=el("p",value,"rounded border p-4");status.setAttribute("role","status");publication.after(status)} }
  function draft() { return Object.fromEntries(Object.keys(fields).map(key=>[key,input(key).value])) }
  function setDraft(value) { for(const key of Object.keys(fields))input(key).value=value[key] }
  function clearPreview() { preview?.remove();preview=null;showingPreview=false }
  function reset() { editingId=undefined;setDraft(blank());clearPreview();dirty=false;form.querySelector("h2").textContent="原稿を新規作成" }
  function renderPreview() {
    preview?.remove();preview=null
    if(!showingPreview)return
    preview=el("section",undefined,"border bg-white p-6 space-y-6");preview.setAttribute("aria-label","原稿プレビュー")
    const value=draft()
    for(const lang of ["ja","en"]) {
      const text=newsText(value,lang),article=el("article");article.lang=text.lang
      article.append(el("p",(lang==="ja"?"日本語":"English")+" · "+value.published_on),el("h2",text.title,"font-bold text-2xl my-3 break-words"),el("p",text.body,"whitespace-pre-wrap break-words"));preview.append(article)
    }
    form.after(preview)
  }
  const primary=fieldset.querySelector('button[type="submit"]').className
  const previewButton=[...fieldset.querySelectorAll("button")].find(n=>n.textContent==="プレビュー")
  const clearButton=[...fieldset.querySelectorAll("button")].find(n=>n.textContent==="入力をクリア")
  const outline=previewButton.className,ghost=clearButton.className
  function renderList() {
    listSection.querySelector("[data-news-items]")?.remove()
    const container=items.length?el("ul",undefined,"divide-y"):el("p","記事はありません。")
    container.dataset.newsItems=""
    for(const item of items) {
      const li=el("li",undefined,"py-4 space-y-2");li.append(el("p",item.published_on+" · "+item.title,"break-words"))
      const edit=el("button","編集",outline);edit.type="button"
      edit.addEventListener("click",()=>{
        if(dirty&&!confirm("入力中の原稿を破棄してこの記事を編集しますか？"))return
        editingId=item.id;setDraft(item);dirty=false;message("");clearPreview();form.querySelector("h2").textContent="原稿を編集";window.scrollTo({top:0,behavior:"smooth"})
      })
      const remove=el("button","一覧から外す",ghost);remove.type="button"
      remove.addEventListener("click",()=>{
        if(confirm("書き出し一覧から外しますか？公開サイトから削除するにはPRとデプロイが必要です。")){items=items.filter(n=>n.id!==item.id);changed=true;renderList()}
      })
      li.append(edit,remove);container.append(li)
    }
    listSection.querySelector("h2").after(container)
  }
  // Remove the SSR list only once, then use the same list markup for all edits.
  for(const n of [...listSection.children])if(n.tagName==="P"||n.tagName==="UL")n.remove()
  fieldset.addEventListener("input",()=>{changed=true;dirty=true;if(showingPreview)renderPreview()})
  fieldset.addEventListener("change",()=>{changed=true;dirty=true})
  form.addEventListener("submit",event=>{
    event.preventDefault()
    const parsed=newsInput.safeParse(draft())
    if(!parsed.success){message(parsed.error.issues[0].message);return}
    try {items=upsertNews(items,parsed.data,editingId);changed=true;reset();renderList();message("編集内容をこの画面の一覧に追加しました。まだ公開されていません。JSONを書き出し、GitHubで変更をPRにしてください。")}
    catch(error){message(error instanceof Error?error.message:"入力を確認してください。")}
  })
  previewButton.addEventListener("click",()=>{showingPreview=!showingPreview;renderPreview()})
  clearButton.addEventListener("click",()=>{if(dirty&&!confirm("入力中の原稿を破棄しますか？"))return;reset()})
  document.getElementById("import-news").addEventListener("change",async event=>{
    const file=event.target.files?.[0];if(!file)return
    if(changed&&!confirm("この画面の編集内容を置き換えます。先にJSONを書き出しましたか？"))return
    try {
      if(file.size>25000000)throw new Error("ファイルが大きすぎます")
      const next=newsCollection.parse(JSON.parse(await file.text()))
      items=next;changed=true;reset();renderList();message("ファイルを読み込みました。公開はされていません。")
    }catch{message("news.jsonの形式を確認してください。元の一覧は保持しています。")}
    event.target.value=""
  })
  const download=[...listSection.querySelectorAll("button")].find(n=>n.textContent==="news.jsonを書き出す")
  download.addEventListener("click",()=>{
    if(dirty){message("入力中の原稿があります。先に「編集内容を一覧へ追加」してください。");return}
    const blob=new Blob([JSON.stringify(newsCollection.parse(items),null,2)+"\n"],{type:"application/json"}),url=URL.createObjectURL(blob),a=el("a")
    a.href=url;a.download="news.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
    changed=false;message("news.jsonを書き出しました。ファイル内は公開予定の全記事です。GitHubの最新版との差分を確認し、新しいブランチでPRを作成してください。")
  })
  window.addEventListener("beforeunload",event=>{if(changed){event.preventDefault();event.returnValue=""}})
  setDraft(blank());renderList()
}
