import test from "node:test"
import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import http from "node:http"
import { createStaticServer } from "../scripts/serve-static.mjs"

const corporate = JSON.parse(await readFile("config/site.json","utf8")).kind === "company"
const config = JSON.parse(await readFile(".vercel/output/config.json","utf8"))
const originalFetch = globalThis.fetch
const server = await createStaticServer()
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve))
const base = "http://127.0.0.1:" + server.address().port
test.after(()=>new Promise(resolve=>server.close(resolve)))
async function get(url, options={}) { return originalFetch(base+url, { ...options, redirect:"manual" }) }

test("export contains only static pages and the explicit form API, with no ISR or middleware", async()=>{
  assert.equal(config.version,3)
  assert.ok(config.routes.every(route=>!route.middlewarePath))
  const release=await (await get("/release.json")).json()
  assert.equal(release.mode,"static")
  assert.deepEqual(release.serverFunctions,corporate?["/api/inquiries"]:[])
  if (corporate) {
    const functions=await readdir(".vercel/output/functions/api")
    assert.deepEqual(functions,["inquiries.func"])
    const manifest=JSON.parse(await readFile(".vercel/output/functions/api/inquiries.func/.vc-config.json","utf8"))
    assert.equal(manifest.runtime,"nodejs24.x")
    assert.ok(!(await readFile(".vercel/output/functions/api/inquiries.func/inquiries.mjs","utf8")).includes("next/server"))
  } else await assert.rejects(readdir(".vercel/output/functions"),{code:"ENOENT"})
})
test("public documents and image sources are static and unknown URLs return 404", async()=>{
  for(const pathname of corporate?["/","/company","/news","/news/rakusika-station","/contact","/security"]:["/ja","/en","/ja/spots","/en/spots","/ja/news","/en/news","/admin/news"]){
    const response=await get(pathname);assert.equal(response.status,200,pathname)
    assert.match(response.headers.get("content-type"),/text\/html/)
    assert.ok(!(await response.text()).includes("/_next/image?"),pathname)
  }
  assert.equal((await get("/missing-static-page")).status,404)
  assert.equal((await get("/_next/image?url=x&w=100&q=75")).status,404)
})
if(corporate){
 test("legacy URLs, retired pages and shop links retain routing without runtime middleware",async()=>{
   for(const [src,location,status] of [["/pages/profile?email=private","https://deervery.com/company",308],["/blogs/news/a?email=private","https://deervery.com/news",308],["/products/zane","/#services",308],["/products/pockets?variant=123","https://shop.deervery.com/products/pockets?variant=123",308]]){
     const r=await get(src);assert.equal(r.status,status,src);assert.equal(r.headers.get("location"),location,src)
   }
   assert.equal((await get("/pages/ksk")).status,410)
   const alias=await new Promise((resolve,reject)=>{ const request=http.get(base+"/company?view=2",{headers:{host:"www.deervery.com"}},response=>{response.resume();resolve(response.headers.location)});request.on("error",reject) })
   assert.equal(alias,"https://deervery.com/company?view=2")
   assert.ok(![301,302,307,308].includes((await get("/cart/add",{method:"POST"})).status))
 })
 test("legacy inquiry aliases sanitize private query fields and duplicate products",async()=>{
   for(const [query,want] of [["?product=rakusika&type=partner&email=private&message=private","https://deervery.com/contact?form=rakusika&type=partnership"],["?product=other","https://deervery.com/contact?form=corporate"],["?product=rakusika&product=shop","https://deervery.com/contact?form=shop"]]){
     const r=await get("/pages/inquiry"+query);assert.equal(r.status,308);assert.equal(r.headers.get("location"),want)
   }
 })
 test("isolated form function keeps origin, size, readiness and receipt contracts",async()=>{
   const saved={...process.env}
   Object.assign(process.env,{NODE_ENV:"production",NEXT_PUBLIC_UNIFIED_FORMS_ENABLED:"true",UNIFIED_FORMS_PUBLIC_ORIGIN:"https://deervery.com",UNIFIED_FORMS_API_URL:"https://intake.invalid/internal/forms/inquiries",UNIFIED_FORMS_API_KEY:"isolated-key",CONTACT_BOT_PROTECTION_ENABLED:"false"})
   const calls=[]
   globalThis.fetch=async(input,init={})=>{
     const url=new URL(input);assert.equal(url.origin,"https://intake.invalid");calls.push({url:url.pathname,init})
     if(url.pathname==="/internal/forms/status")return Response.json({readyForms:["corporate","rakusika","local-host","shop"]})
     const body=JSON.parse(init.body);return Response.json({id:body.id,delivery:"pending"},{status:202})
   }
   try{
     for(const form of ["corporate","rakusika","local-host","shop"])assert.equal((await (await get("/api/inquiries?form="+form)).json()).ready,true)
     const body={id:"8a5bcf29-e192-45d0-8abf-0b3c47f50101",form:"corporate",kind:"service",name:"合成テスト",email:"test@example.invalid",message:"非公開テスト",consent:true,consentVersion:"2026-10-17-v1",website:""}
     const headers={origin:"https://deervery.com","content-type":"application/json"}
     assert.equal((await get("/api/inquiries",{method:"POST",headers:{...headers,origin:"https://evil.invalid"},body:JSON.stringify(body)})).status,403)
     assert.equal((await get("/api/inquiries",{method:"POST",headers,body:JSON.stringify({...body,answers:{x:1}})})).status,400)
     assert.equal((await get("/api/inquiries",{method:"POST",headers,body:"x".repeat(32769)})).status,413)
     const response=await get("/api/inquiries",{method:"POST",headers,body:JSON.stringify(body)})
     assert.equal(response.status,202);assert.deepEqual(await response.json(),{id:body.id,delivery:"pending"})
     assert.equal(calls.filter(call=>call.url==="/internal/forms/inquiries").length,1)
     // A chunked body cannot bypass the limit.
     const status=await new Promise((resolve,reject)=>{
       const request=http.request(base+"/api/inquiries",{method:"POST",headers},response=>{response.resume();resolve(response.statusCode)})
       request.on("error",reject);request.write("x".repeat(20000));request.end("x".repeat(20000))
     })
     assert.equal(status,413)
   }finally{globalThis.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved)}
 })
}else{
 test("all tourism rows are present in initial HTML without a CMS fetch",async()=>{
   for(const [name,count] of [["spots",10],["restaurants",6],["accommodations",4],["events",9],["shops",8]]){
     const data=await (await get("/api/cms/"+name)).json();assert.equal(data.length,count)
     const page={restaurants:"dining",shops:"shopping"}[name]||name
     const ja=await (await get("/ja/"+page)).text()
     const en=await (await get("/en/"+page)).text()
     for(const item of data){assert.ok(ja.includes(item.name),item.name);assert.ok(en.includes(item.name_en||item.name),item.name)}
   }
 })
 test("language metadata and redirects work as static hosting rules",async()=>{
   for(const lang of ["ja","en"]){
     const html=await (await get("/"+lang+"/spots")).text()
     assert.ok(html.includes('<html lang="'+lang+'"'))
     assert.ok(html.includes('rel="canonical" href="https://furubira-kanko.com/'+lang+'/spots"'))
     assert.match(html,/hreflang="en"/i)
   }
   assert.equal((await get("/",{headers:{"accept-language":"en-US,en;q=0.9"}})).headers.get("location"),"/en")
   assert.equal((await get("/",{headers:{cookie:"lang=ja","accept-language":"en-US"}})).headers.get("location"),"/ja")
   assert.equal((await get("/spots",{headers:{cookie:"lang=en"}})).headers.get("location"),"/en/spots")
 })
 test("news reads, authoring shell, retired APIs and missing articles need no functions",async()=>{
   assert.ok(Array.isArray(await (await get("/api/news")).json()))
   assert.equal((await get("/ja/news/missing-id")).status,404)
   assert.equal((await get("/ja/news/__empty_export__")).status,404)
   assert.ok((await (await get("/admin/news")).text()).includes("お知らせ編集"))
   for(const pathname of ["/api/chat","/api/chat/session","/api/embedding","/api/system_message"]){
     const r=await get(pathname,{method:"POST"});assert.equal(r.status,410);assert.equal(r.headers.get("cache-control"),"no-store")
   }
   assert.equal((await get("/robots.txt")).status,200);assert.equal((await get("/sitemap.xml")).status,200)
 })
}
