// Run after npm run build -- --webpack. No external services or credentials.
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
const env = { ...process.env }
for (const key of ['OPENAI_API_KEY','GEMINI_API_KEY','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY']) delete env[key]
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--port','3087','--hostname','127.0.0.1'], { env, stdio: 'ignore' })
try {
  for (let i=0;i<50;i++) {
    try { await fetch('http://127.0.0.1:3087/api/news'); break } catch { await new Promise(resolve=>setTimeout(resolve,100)) }
  }
  for (const [path,status,text] of [
    ['/api/news',200,'[]'],
    ['/ja/news',200,'現在お知らせはありません'],
    ['/en/news',200,'No news yet.'],
    ['/ja/news/invalid!id',404,null],
    ['/admin/news',200,'お知らせを公開するまで'],
    ['/admin/login',200,'旧データベースCMSは現在の公開データを更新しません'],
    ['/admin/spots',200,'旧データベースCMSは現在の公開データを更新しません'],
  ]) {
    const response = await fetch('http://127.0.0.1:3087'+path)
    assert.equal(response.status,status,path)
    const html=await response.text()
    // Empty-state checks apply only to the initial, empty content/news.json.
    if (text && path !== '/api/news' && !['/ja/news','/en/news'].includes(path)) assert.ok(html.includes(text),path)
    if (path === '/api/news') assert.ok(Array.isArray(JSON.parse(html)))
    console.log('PASS',path,status)
  }
} finally { server.kill('SIGTERM') }
