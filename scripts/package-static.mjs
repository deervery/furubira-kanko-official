import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises"
import path from "node:path"
import { stripTypeScriptTypes } from "node:module"

const root = process.cwd()
const corporate = (await readFile("package.json", "utf8")).includes('"deervery-corporate"')
const output = path.resolve(".vercel/output")
if (output !== path.join(root, ".vercel", "output")) throw new Error("Unexpected output directory")
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
const escape = value => value.replace(/[.*+?^$()|[\]\\]/g, "\\$&")
async function files(dir) {
  const rows = await readdir(dir, { withFileTypes: true })
  const result = []
  for (const row of rows) {
    const filename = path.join(dir, row.name)
    if (row.isDirectory()) result.push(...await files(filename)); else result.push(filename)
  }
  return result
}
const routes = []
const readMethods = ["GET", "HEAD"]
const fixedRedirect = (src, location, status = 308) => ({ src, headers: { Location: location }, status, methods: readMethods, ...(corporate ? { transforms: [{ type: "request.query", op: "delete", target: { key: { pre: "" } } }] } : {}) })
if (corporate) {
  const { legacyCorporateRedirects, retiredPagePaths, shopProductHandles, legacyShopPaths } = await import("../lib/domain-migration.mjs")
  await writeFile("out/410.html", '<!doctype html><html lang="ja"><meta charset="utf-8"><title>公開を終了しました | ディアベリー株式会社</title><h1>このページの公開は終了しました。</h1><a href="/">会社サイトへ</a></html>')
  for (const source of retiredPagePaths) {
    for (const encoded of new Set([source, encodeURI(source)])) routes.push({ src: escape(encoded) + "/?", dest: "/410.html", status: 410, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } })
  }
  routes.push({ src: "/pages/inquiry/?", dest: "/api/inquiries?legacyContact=1", methods: readMethods })
  for (const [source, dest] of Object.entries(legacyCorporateRedirects)) {
    for (const encoded of new Set([source, encodeURI(source)])) routes.push(fixedRedirect(escape(encoded) + "/?", "https://deervery.com" + dest))
  }
  routes.push(fixedRedirect("/blogs/news/.*", "https://deervery.com/news"))
  routes.push(fixedRedirect("/products(?:/(?:zane|ezoshika))?/?", "/#services"))
  routes.push(fixedRedirect("/blog(?:/.*)?", "/news"))
  routes.push(fixedRedirect("/admin(?:/.*)?", "/", 307))
  routes.push({ src: "/(.*)", dest: "https://deervery.com/$1", status: 308, methods: readMethods, has: [{ type: "host", value: "(?:www|company)\\.deervery\\.com" }] })
  for (const source of [...shopProductHandles.map(handle => "/products/" + handle), ...legacyShopPaths]) {
    for (const encoded of new Set([source, encodeURI(source)])) routes.push({ src: "(" + escape(encoded) + ")/?", dest: "https://shop.deervery.com$1", status: 308, methods: readMethods })
  }
  routes.push({ src: "/((?:collections|blogs|policies|cart|account|customer_authentication|checkouts|apps)(?:/.*)?|checkout|search|products\\.json)", dest: "https://shop.deervery.com/$1", status: 308, methods: readMethods })
  const func = path.join(output, "functions/api/inquiries.func")
  await mkdir(func, { recursive: true })
  for (const [source, target] of [["server/inquiries.ts", "inquiries.mjs"], ["lib/turnstile.ts", "turnstile.mjs"], ["lib/form-origin.ts", "form-origin.mjs"]]) {
    let js = stripTypeScriptTypes(await readFile(source, "utf8"))
    js = js.replace(/from "@\/lib\/([^"]+)"/g, 'from "./$1.mjs"')
    await writeFile(path.join(func, target), js)
  }
  await cp("server/entry.mjs", path.join(func, "index.mjs"))
  await cp("lib/domain-migration.mjs", path.join(func, "domain-migration.mjs"))
  await writeFile(path.join(func, ".vc-config.json"), JSON.stringify({ runtime: "nodejs24.x", handler: "index.mjs", launcherType: "Nodejs", maxDuration: 30 }))
} else {
  const js = stripTypeScriptTypes(await readFile("lib/hardcoded-data.ts", "utf8"))
  const source = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"))
  await mkdir("out/data", { recursive: true })
  for (const [name, data] of Object.entries({ spots: source.spotsData, restaurants: source.restaurantsData, accommodations: source.accommodationsData, events: source.eventsData, shops: source.shopsData })) {
    await writeFile("out/data/" + name + ".json", JSON.stringify([...data].sort((a,b) => (a.display_order || 0) - (b.display_order || 0))) + "\n")
  }
  await cp("content/news.json", "out/data/news.json")
  await writeFile("out/retired-api.json", JSON.stringify({ error: "この旧APIは公開を終了しました。" }))
  await writeFile("out/index.html", '<!doctype html><html lang="ja"><meta charset="utf-8"><title>古平町観光協会</title><a href="/ja">日本語</a> <a href="/en">English</a></html>')
  for (const src of ["/", "/(spots|accommodations|dining|events|access|shopping|furusato|news(?:/.*)?)"]) {
    for (const lang of ["ja", "en"]) routes.push({ ...fixedRedirect(src, "/" + lang + (src === "/" ? "" : "/$1"), 307), has: [{ type: "cookie", key: "lang", value: lang }] })
    routes.push({ ...fixedRedirect(src, "/en" + (src === "/" ? "" : "/$1"), 307), has: [{ type: "header", key: "accept-language", value: "[eE][nN].*" }] })
    routes.push(fixedRedirect(src, "/ja" + (src === "/" ? "" : "/$1"), 307))
  }
  routes.push({ src: "/api/cms/(spots|restaurants|accommodations|events|shops)", dest: "/data/$1.json" })
  routes.push({ src: "/api/news", dest: "/data/news.json", headers: { "Cache-Control": "no-store" } })
  routes.push({ src: "/api/(?:chat(?:/.*)?|embedding|system_message)", dest: "/retired-api.json", status: 410, headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" } })
}
for (const filename of await files("out")) if (filename.includes("/news/__empty_export__")) await rm(filename)
const html = (await files("out")).filter(filename => filename.endsWith(".html"))
const overrides = {}
const origin = corporate ? "https://deervery.com" : "https://furubira-kanko.com"
const urls = []
for (const filename of html) {
  const rel = path.relative("out", filename).split(path.sep).join("/")
  const pathname = rel === "index.html" ? "" : rel.replace(/\.html$/, "")
  let text = await readFile(filename, "utf8")
  if (text.includes("/_next/image?")) throw new Error("Runtime image optimizer found: " + filename)
  if (!corporate && /^(ja|en)(\/|$)/.test(pathname)) {
    const lang = pathname.split("/")[0]
    text = text.replace(/<html([^>]*?)lang="[^"]*"/, '<html$1lang="' + lang + '"')
    const pagePath = "/" + pathname
    const otherPath = pagePath.replace(/^\/(?:ja|en)/, "")
    text = text.replace(/<link rel="canonical"[^>]*>/g, "").replace(/<link rel="alternate"[^>]*hrefLang[^>]*>/gi, "")
    text = text.replace("</head>", '<link rel="canonical" href="' + origin + pagePath + '"/><link rel="alternate" hrefLang="ja" href="' + origin + "/ja" + otherPath + '"/><link rel="alternate" hrefLang="en" href="' + origin + "/en" + otherPath + '"/></head>')
  }
  if (!/^(?:404|410|_not-found|admin(?:\/|$))/.test(pathname)) urls.push(origin + "/" + pathname)
  await writeFile(filename, text)
  overrides[rel] = ["404.html", "410.html"].includes(rel) ? { contentType: "text/html; charset=utf-8" } : { path: pathname, contentType: "text/html; charset=utf-8" }
}
if (!corporate) {
  await writeFile("out/robots.txt", "User-agent: *\nAllow: /\nSitemap: " + origin + "/sitemap.xml\n")
  await writeFile("out/sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(url => "<url><loc>" + url + "</loc></url>").join("") + "</urlset>")
}
routes.push({ src: "/_next/static/.*", headers: { "Cache-Control": "public,max-age=31536000,immutable" }, continue: true })
routes.push({ handle: "filesystem" })
routes.push({ src: "/.*", dest: "/404.html", status: 404 })
await writeFile("out/release.json", JSON.stringify({ revision: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "local", mode: "static", serverFunctions: corporate ? ["/api/inquiries"] : [] }) + "\n")
await cp("out", path.join(output, "static"), { recursive: true })
await writeFile(path.join(output, "config.json"), JSON.stringify({ version: 3, routes, overrides }, null, 2) + "\n")
console.log("Static HTML pages: " + html.length + "; runtime functions: " + (corporate ? 1 : 0))
