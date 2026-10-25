import http from "node:http"
import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
// Development/test only. Deployment contains files and the isolated form function, not this server.
export async function createStaticServer() {
  const output = path.resolve(".vercel/output")
  const staticRoot = path.join(output, "static")
  const config = JSON.parse(await readFile(path.join(output, "config.json"), "utf8"))
  const aliases = new Map(Object.entries(config.overrides || {}).map(([file, value]) => ["/" + (value.path ?? file), file]))
  const mime = { ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"text/javascript", ".mjs":"text/javascript", ".json":"application/json", ".txt":"text/plain", ".xml":"application/xml", ".woff2":"font/woff2", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp", ".svg":"image/svg+xml", ".ico":"image/x-icon" }
  async function sendFile(req, res, pathname, status = 200) {
    let decoded
    try { decoded = decodeURIComponent(pathname) } catch { res.writeHead(400); res.end(); return true }
    const rel = aliases.get(decoded.replace(/\/$/, "") || "/") || decoded.slice(1)
    const filename = path.resolve(staticRoot, rel || "index.html")
    if (!filename.startsWith(staticRoot + path.sep)) return false
    try {
      if (!(await stat(filename)).isFile()) return false
      const data = await readFile(filename)
      res.statusCode = status
      if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", mime[path.extname(filename)] || "application/octet-stream")
      res.end(req.method === "HEAD" ? undefined : data)
      return true
    } catch { return false }
  }
  return http.createServer(async (req, res) => {
    try {
      let url = new URL(req.url, "http://localhost")
      const cookies = Object.fromEntries((req.headers.cookie || "").split(";").map(pair=>pair.trim().split("=")).filter(pair=>pair[0]))
      const has = conditions => (conditions || []).every(c => {
        const values = c.type === "host" ? [String(req.headers.host || "").split(":")[0]] : c.type === "cookie" ? [cookies[c.key]] : c.type === "header" ? [req.headers[c.key.toLowerCase()]] : url.searchParams.getAll(c.key)
        return values.length === 1 && values[0] !== undefined && (c.value === undefined || new RegExp("^(?:" + (typeof c.value === "object" ? c.value.re : c.value) + ")$").test(values[0]))
      })
      for (const route of config.routes) {
        if (route.handle === "filesystem") {
          const functionFile = path.join(output, "functions", url.pathname.slice(1) + ".func/index.mjs")
          try {
            await stat(functionFile)
            req.url = url.pathname + url.search
            const { default: handler } = await import(pathToFileURL(functionFile).href)
            await handler(req, res); return
          } catch (error) { if (error.code !== "ENOENT") throw error }
          if (await sendFile(req, res, url.pathname)) return
          continue
        }
        const match = new RegExp("^(?:" + route.src + ")$").exec(url.pathname) || new RegExp("^(?:" + route.src + ")$").exec(decodeURIComponent(url.pathname))
        if (!match || (route.methods && !route.methods.includes(req.method)) || !has(route.has)) continue
        for (const transform of route.transforms || []) {
          if (transform.type === "request.query" && transform.op === "delete" && transform.target.key.pre === "") url.search = ""
        }
        const expand = value => value.replace(/\$(\d+)/g, (_,n)=>match[Number(n)] || "")
        for (const [key, value] of Object.entries(route.headers || {})) res.setHeader(key, expand(value))
        if (route.status >= 300 && route.status < 400) {
          {
            const configured = res.getHeader("Location") || expand(route.dest)
            const dest = new URL(configured, "http://localhost")
            if (!dest.search) dest.search = url.search
            res.setHeader("Location", String(configured).startsWith("http") ? dest.href : dest.pathname + dest.search + dest.hash)
          }
          res.statusCode = route.status; res.end(); return
        }
        if (route.continue) continue
        if (route.dest) {
          const next = new URL(expand(route.dest), "http://localhost")
          for (const [key,value] of url.searchParams) next.searchParams.append(key,value)
          url = next
          if (route.status && await sendFile(req,res,url.pathname,route.status)) return
        }
      }
      res.writeHead(404); res.end("Not found")
    } catch (error) { res.writeHead(500); res.end("Static preview failed"); console.error(error.message) }
  })
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createStaticServer()
  server.listen(Number(process.env.PORT || 3087), "127.0.0.1", () => console.log("Static preview at 127.0.0.1:" + server.address().port))
}
