import test from 'node:test'
import assert from 'node:assert/strict'
import { newsInput, canEditNews, newsText } from '../lib/news.ts'
const draft = { title: '  日本語  ', body: '本文\n二行目', title_en: '', body_en: '', published_on: '2026-10-05', is_published: false }
test('validation trims text and preserves draft/public transitions', () => {
  assert.equal(newsInput.parse(draft).title, '日本語')
  assert.equal(newsInput.parse(draft).is_published, false)
  assert.equal(newsInput.parse({...draft, is_published: true}).is_published, true)
  assert.equal(newsInput.parse({...draft, is_published: false}).is_published, false)
})
test('rejects blank, oversized, partial translations and invalid dates', () => {
  for (const change of [{ title: ' ' }, { body: '' }, { title: 'a'.repeat(201) }, { body: 'a'.repeat(20001) }, { title_en: 'News' }, { published_on: '2026-02-30' }, { published_on: 'tomorrow' }]) assert.equal(newsInput.safeParse({...draft, ...change}).success, false)
})
test('editor privilege cannot be self granted using user_metadata', () => {
  assert.equal(canEditNews(null), false)
  assert.equal(canEditNews({user_metadata: {news_editor: true}}), false)
  assert.equal(canEditNews({app_metadata: {news_editor: 'true'}}), false)
  assert.equal(canEditNews({app_metadata: {news_editor: true}}), true)
})
test('English uses complete translation or Japanese fallback as a pair', () => {
  assert.equal(newsText(draft, 'en').lang, 'ja')
  const translated = {...draft, title_en: 'News', body_en: 'Details'}
  assert.deepEqual(newsText(translated, 'en'), {title:'News', body:'Details', lang:'en'})
  assert.equal(newsText(translated, 'ja').body, draft.body)
})
