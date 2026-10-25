// Test-only CONNECT proxy. Browsers keep real TLS/SNI/certificate verification,
// while a single owned hostname connects to the VPS before its DNS cutover.
import http from 'node:http'
import net from 'node:net'

const hostname = process.env.VPS_ORIGIN_HOST
const address = process.env.VPS_ORIGIN_IP
const port = Number(process.env.PROXY_PORT || 4175)
const owned = new Set(['furubira-kanko.com', 'deervery.com'])
if (!owned.has(hostname) || !net.isIP(address) || !Number.isInteger(port)) {
  throw new Error('An owned hostname and explicit VPS address are required')
}
let active = 0
const server = http.createServer((req, res) => {
  res.writeHead(req.url === '/healthz' ? 200 : 403)
  res.end(req.url === '/healthz' ? 'ready' : 'CONNECT only')
})
server.on('connect', (req, client, head) => {
  let target
  try { target = new URL('http://' + req.url) } catch { client.destroy(); return }
  if (target.hostname !== hostname || target.port !== '443' || active >= 64) {
    client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
    return
  }
  active++
  const upstream = net.createConnection({ host: address, port: 443 })
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    active--
    client.destroy()
    upstream.destroy()
  }
  upstream.setTimeout(30000, close)
  upstream.on('error', close)
  client.on('error', close)
  upstream.on('close', close)
  client.on('close', close)
  upstream.once('connect', () => {
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
    if (head.length) upstream.write(head)
    client.pipe(upstream)
    upstream.pipe(client)
  })
})
server.listen(port, '127.0.0.1', () => console.log('Owned-origin TLS test proxy ready on loopback:' + port))
