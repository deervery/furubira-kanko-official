import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { newsInput, newsCollection, newsText, upsertNews, sortNews } from '../lib/news.ts'
const draft = { id: '2026-10-05-news', title: '  日本語  ', body: '本文\n二行目', title_en: '', body_en: '', published_on: '2026-10-05' }
test('validates shipped static JSON, rejects duplicates and old database state', () => {
  assert.ok(Array.isArray(newsCollection.parse(JSON.parse(readFileSync(new URL('../content/news.json', import.meta.url), 'utf8')))))
  assert.equal(newsCollection.safeParse([draft,draft]).success,false)
  assert.equal(newsInput.safeParse({...draft,is_published:false}).success,false)
})
test('JSON export and re-import preserve edited data and text', () => {
  const items=upsertNews([],draft)
  assert.equal(items[0].title,'日本語')
  assert.deepEqual(newsCollection.parse(JSON.parse(JSON.stringify(items))),items)
  const updated=upsertNews(items,{...draft,title:'更新'},draft.id)
  assert.equal(updated.length,1);assert.equal(updated[0].title,'更新')
  assert.throws(()=>upsertNews(items,draft))
})
test('rejects blank, oversized, invalid IDs, partial translations and dates', () => {
  for (const change of [{ id:'../secret' },{id:'A B'},{title:' '},{body:''},{title:'a'.repeat(201)},{body:'a'.repeat(20001)},{title_en:'News'},{published_on:'2026-02-30'},{published_on:'tomorrow'}]) assert.equal(newsInput.safeParse({...draft,...change}).success,false)
})
test('English uses complete translation or Japanese fallback as a pair', () => {
  assert.equal(newsText(draft,'en').lang,'ja')
  const translated={...draft,title_en:'News',body_en:'Details'}
  assert.deepEqual(newsText(translated,'en'),{title:'News',body:'Details',lang:'en'})
  assert.equal(newsText(translated,'ja').body,draft.body)
})
test('sorting is stable by display date then ID without mutating source', () => {
  const items=[{...draft,id:'z'},{...draft,id:'a'},{...draft,id:'new',published_on:'2026-10-06'}]
  assert.deepEqual(sortNews(items).map(x=>x.id),['new','a','z'])
  assert.equal(items[0].id,'z')
})
