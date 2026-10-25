import { test, expect } from "@playwright/test"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
const kind=JSON.parse(readFileSync(new URL("../../config/site.json",import.meta.url),"utf8")).kind
const reference="http://127.0.0.1:4173",candidate="http://127.0.0.1:4174"
const externalImageFixture=readFileSync(new URL("../../public/no_photo.jpg",import.meta.url))
const screenshotStyle="canvas{visibility:hidden!important}iframe{visibility:hidden!important}"
test.beforeEach(async({context},info)=>{
 // Both renderers choose a random initial slide. Fix only this test input.
 await context.addInitScript(()=>{Math.random=()=>0})
 let attempts=0
 await context.route("**/*",async route=>{
  const req=route.request(),url=new URL(req.url())
  if(url.pathname==="/api/inquiries"){
   if(req.method()==="GET")return route.fulfill({json:{ready:true}})
   const body=req.postDataJSON();attempts++
   if(info.title.includes("uncertain retry")&&attempts===1)return route.fulfill({status:503,json:{message:"隔離テスト: 受付状態の確認が必要です。"}})
   return route.fulfill({status:202,json:{id:body.id,delivery:"pending"}})
  }
  if(url.hostname==="challenges.cloudflare.com")return route.fulfill({contentType:"text/javascript",body:'window.turnstile={render(el,opts){queueMicrotask(()=>opts.callback("isolated-test-token"));return "isolated-widget"},remove(){}}'})
  // External SNS URLs can expire independently of the site. Give both renderers
  // the same image bytes; exercise the error callback separately after hydration.
  if(url.hostname!=="127.0.0.1"&&url.hostname!=="localhost"){
   if(req.resourceType()==="image")return route.fulfill({contentType:"image/jpeg",body:externalImageFixture})
   return route.abort("blockedbyclient")
  }
  return route.continue()
 })
})
async function ready(page,pathname){
 // Playwright discourages networkidle for readiness: Firefox can retain aborted
 // external requests. Wait for the document plus observable UI/assets instead.
 await page.goto(pathname,{waitUntil:"domcontentloaded",timeout:15000})
 if(await page.locator("header").count())await expect(page.locator("header")).toHaveCSS("opacity","1",{timeout:15000})
 await page.evaluate(async()=>{
  for(const img of document.images)img.loading="eager"
  await document.fonts.ready
 })
 await expect.poll(()=>page.evaluate(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0)),{timeout:15000}).toBe(true)
 await page.evaluate(async()=>{
  await Promise.race([
   Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))),
   new Promise((_,reject)=>setTimeout(()=>reject(new Error("Image decode readiness timed out")),15000))
  ])
 })
}
async function settleHome(page){
 await expect(page.locator("h1")).toHaveCSS("opacity","1",{timeout:15000})
 // Exercise the delayed introduction instead of hiding it in a full-page screenshot.
 const intro=page.locator("section").filter({has:page.getByText("-FIRE WALKING RITUAL-",{exact:true})})
 await intro.scrollIntoViewIfNeeded()
 await expect(intro.locator(".transition-opacity").first()).toHaveCSS("opacity","1",{timeout:10000})
 await page.evaluate(()=>window.scrollTo(0,0))
 await page.waitForTimeout(1500)
 for(const region of await page.getByRole("region",{name:""}).filter({has:page.locator('[aria-roledescription="slide"]')}).all()){
  // Exercise Embla's keyboard focus path: it selects slide zero and stops autoplay.
  // Focusing the outer region does neither; a snap is centered, not left-aligned.
  await region.evaluate(el=>{
   document.dispatchEvent(new KeyboardEvent("keydown",{key:"Tab",code:"Tab",bubbles:true}))
   const slide=el.querySelector('[aria-roledescription="slide"]')
   slide.tabIndex=0;slide.focus({preventScroll:true});slide.blur()
  })
 }
 await page.evaluate(()=>window.scrollTo(0,0))
}
async function matchPages(ref,page,filename,info,fullPage=true){
 const options={fullPage,scale:"css",animations:"disabled",style:screenshotStyle,caret:"hide"}
 async function stableCapture(target){
  let previous=await target.screenshot(options)
  for(let attempt=0;attempt<5;attempt++){
   const current=await target.screenshot(options)
   if(previous.equals(current))return current
   previous=current
  }
  throw new Error("The renderer did not produce two consecutive identical captures")
 }
 const expected=await stableCapture(ref)
 const actual=await stableCapture(page)
 const snapshot=info.snapshotPath(filename);mkdirSync(path.dirname(snapshot),{recursive:true});writeFileSync(snapshot,expected)
 try{
  expect(actual).toMatchSnapshot(filename,{maxDiffPixels:0,threshold:0})
 }catch(error){
  if(filename.includes("ja_furusato")){
   const measure=p=>p.locator("main").evaluate(root=>[...root.querySelectorAll("*")].map(n=>{
    const s=getComputedStyle(n),r=n.getBoundingClientRect()
    return {tag:n.tagName,class:n.getAttribute("class"),rect:r.toJSON(),style:Object.fromEntries(["display","position","height","width","border-radius","border-color","box-shadow","transform","opacity","overflow","font","line-height","letter-spacing","will-change","background-color"].map(k=>[k,s.getPropertyValue(k)]))}
   }))
   await info.attach("furusato-layout.json",{body:Buffer.from(JSON.stringify({reference:await measure(ref),candidate:await measure(page)},null,2)),contentType:"application/json"})
  }
  throw error
 }
}
const routes=kind==="company"
 ? ["/","/company","/news","/news/rakusika-station","/news/rakusika-facility-adoption","/news/rakusika-english-labels","/products/rakusika","/products/local-host","/security","/privacy-policy","/terms","/contact"]
 : ["/ja","/en",...["spots","accommodations","dining","events","shopping","access","furusato","news"].flatMap(p=>["/ja/"+p,"/en/"+p]),"/admin","/admin/news","/admin/login","/admin/dashboard"]
for(const viewport of [{name:"desktop",width:1440,height:1000},{name:"mobile",width:390,height:844}]){
 test.describe(viewport.name,()=>{
  test.use({viewport:{width:viewport.width,height:viewport.height}})
  for(const route of routes)test("pixels "+route,async({page,context},info)=>{
   const ref=await context.newPage()
   const errors=[];page.on("pageerror",e=>errors.push(e.message))
   await ready(ref,reference+route);await ready(page,candidate+route)
   if(kind==="company"&&route==="/contact"){
    await expect(ref.getByRole("heading",{name:"お問い合わせ",exact:true})).toBeVisible()
    await expect(ref.getByText("この窓口は接続準備中です。現在は送信できません。")).toHaveCount(0)
   }
   if(kind==="tourism"&&["/ja","/en"].includes(route)){await settleHome(ref);await settleHome(page)}
   await matchPages(ref,page,viewport.name+"-"+route.replaceAll("/","_")+".png",info)
   expect(errors).toEqual([])
   await ref.close()
  })
  test("mobile navigation and language/escape behavior",async({page,context},info)=>{
   if(viewport.name!=="mobile")test.skip()
   const route=kind==="company"?"/company":"/en/spots",ref=await context.newPage()
   await ready(ref,reference+route);await ready(page,candidate+route)
   for(const p of [ref,page]){
    const toggle=kind==="company"?p.getByRole("button",{name:"メニューを開く"}):p.locator('button[aria-haspopup="dialog"]')
    await toggle.click()
    if(kind==="company")await expect(p.getByRole("navigation",{name:"モバイルナビゲーション"})).toBeVisible()
    else {
     await expect(p.getByRole("dialog")).toBeVisible()
     await expect(p.getByRole("dialog").locator("a button").first()).toBeFocused()
    }
   }
   await matchPages(ref,page,viewport.name+"-menu.png",info,false)
   for(const p of [ref,page]){
    await p.keyboard.press("Escape")
    if(kind==="company")await expect(p.getByRole("navigation",{name:"モバイルナビゲーション"})).toHaveCount(0)
    else await expect(p.getByRole("dialog")).toHaveCount(0)
   }
   if(kind==="tourism"){
    await page.locator('button[aria-haspopup="dialog"]').click();await page.getByRole("link",{name:"JA",exact:true}).last().click()
    await expect(page).toHaveURL(candidate+"/ja/spots");await expect(page.locator("html")).toHaveAttribute("lang","ja")
   }
   await ref.close()
  })
  if(kind==="company"){
   test("review screen matches without sending an inquiry",async({page,context},info)=>{
    const ref=await context.newPage()
    for(const [p,base] of [[ref,reference],[page,candidate]]){
     await ready(p,base+"/contact?form=rakusika&type=partner")
     await p.getByLabel("お名前必須",{exact:true}).fill("表示比較用の合成データ")
     await p.getByLabel("メールアドレス必須",{exact:true}).fill("test@example.invalid")
     await p.getByLabel("ご相談内容必須",{exact:true}).fill("外部へ送信しない隔離環境のテストです。")
     await p.getByRole("button",{name:"内容を確認する",exact:true}).click()
     await expect(p.getByRole("heading",{name:"送信内容をご確認ください。"})).toBeVisible()
    }
    await matchPages(ref,page,viewport.name+"-contact-review.png",info)
    await ref.close()
   })
   test("uncertain retry preserves frozen content and the same receipt",async({page})=>{
    const requests=[]
    page.on("request",r=>{if(r.method()==="POST"&&new URL(r.url()).pathname==="/api/inquiries")requests.push(r.postDataJSON())})
    await ready(page,candidate+"/contact?form=shop")
    await page.getByLabel("お名前必須",{exact:true}).fill("合成テスト")
    await page.getByLabel("メールアドレス必須",{exact:true}).fill("test@example.invalid")
    await page.getByLabel("ご相談内容必須",{exact:true}).fill("隔離モックだけに送信されます。")
    await page.getByRole("button",{name:"内容を確認する",exact:true}).click()
    await expect(page.getByRole("button",{name:"同意して送信する",exact:true})).toBeDisabled()
    await page.getByRole("checkbox").check()
    await page.getByRole("button",{name:"同意して送信する",exact:true}).click()
    await expect(page.getByRole("alert")).toContainText("隔離テスト")
    await expect(page.getByRole("button",{name:"入力を修正する"})).toBeDisabled()
    await page.getByRole("button",{name:"同意して送信する",exact:true}).click()
    await expect(page.getByRole("heading",{name:"お問い合わせを受け付けました。"})).toBeVisible()
    expect(requests).toHaveLength(2);expect(requests[0].id).toBe(requests[1].id)
    expect(requests[0].message).toBe(requests[1].message)
    await expect(page.getByText("受付内容は保存済みです。担当者への通知を確認しています。再送信は不要です。")).toBeVisible()
   })
  }else{
   test("stored system theme follows browser preference changes",async({page,context})=>{
    await context.addInitScript(()=>localStorage.setItem("theme","system"))
    for(const base of [reference,candidate]){
     await page.emulateMedia({colorScheme:"dark"});await page.goto(base+"/ja/spots")
     await expect(page.locator("html")).toHaveClass(/dark/)
     await page.emulateMedia({colorScheme:"light"})
     await expect(page.locator("html")).toHaveClass(/light/)
    }
   })
   test("external image failure retains the existing local fallback",async({page,context})=>{
    const ref=await context.newPage()
    for(const [target,base] of [[ref,reference],[page,candidate]]){
     await ready(target,base+"/en/shopping")
     await expect(target.locator("header")).toHaveCSS("opacity","1")
     const image=target.getByRole("img",{name:"Yamadai Fujita",exact:true})
     await expect(image).toHaveCount(1)
     await target.route("**/*isolated-image-failure=1",route=>route.abort("failed"))
     await image.evaluate(node=>{
      const url=new URL(node.src);url.searchParams.set("isolated-image-failure","1");node.src=url.href
     })
     await expect.poll(()=>image.evaluate(node=>new URL(node.currentSrc,location.href).pathname==="/no_photo.jpg"&&node.complete&&node.naturalWidth>0)).toBe(true)
    }
    await ref.close()
   })
   test("news editing, dirty protection, export and import",async({page})=>{
    await ready(page,candidate+"/admin/news")
    await page.getByLabel("記事ID（必須・URLに使用）",{exact:true}).fill("isolated-test")
    await page.getByLabel("タイトル（日本語・必須）",{exact:true}).fill("合成記事")
    await page.getByLabel("本文（日本語・必須）",{exact:true}).fill("本文\n二行目 <script> text only")
    await page.getByRole("button",{name:"news.jsonを書き出す",exact:true}).click()
    await expect(page.getByRole("status")).toContainText("入力中の原稿")
    await page.getByRole("button",{name:"プレビュー",exact:true}).click()
    await expect(page.getByRole("region",{name:"原稿プレビュー"})).toContainText("<script> text only")
    await page.getByRole("button",{name:"編集内容を一覧へ追加",exact:true}).click()
    await expect(page.getByRole("status")).toContainText("まだ公開されていません")
    const downloadEvent=page.waitForEvent("download")
    await page.getByRole("button",{name:"news.jsonを書き出す",exact:true}).click()
    const download=await downloadEvent;const file=await download.path()
    const items=JSON.parse(readFileSync(file,"utf8"));expect(items).toHaveLength(1);expect(items[0].body).toContain("<script>")
    await page.locator("#import-news").setInputFiles({name:"news.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(items))})
    await expect(page.getByRole("status")).toContainText("ファイルを読み込みました")
    page.once("dialog",d=>d.accept());await page.getByRole("button",{name:"一覧から外す",exact:true}).click()
    await expect(page.getByText("記事はありません。",{exact:true})).toBeVisible()
   })
  }
 })
}
