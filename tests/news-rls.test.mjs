// npm install --no-save --package-lock=false --ignore-scripts @electric-sql/pglite
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('real SQL RLS: draft -> public -> private, unprivileged writes blocked', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
      grant usage on schema public, auth to anon, authenticated; grant execute on function auth.jwt() to anon, authenticated;`)
    await db.exec(await readFile(new URL('../docs/sql/07_create_news.sql', import.meta.url), 'utf8'))
    await db.exec(`set role authenticated; set request.jwt.claims = '{"app_metadata":{"news_editor":true}}';`)
    const {rows:[created]} = await db.query(`insert into news(title,body,published_on) values ('Test','Body','2026-10-05') returning id,updated_at::text`)
    const id = created.id
    await db.exec(`reset role; set role anon; set request.jwt.claims = '{}';`)
    assert.equal((await db.query('select * from news')).rows.length, 0)
    await assert.rejects(db.query(`insert into news(title,body) values ('bad','bad')`))
    await db.exec(`reset role; set role authenticated; set request.jwt.claims = '{"user_metadata":{"news_editor":true}}';`)
    assert.equal((await db.query('select * from news')).rows.length, 0)
    await assert.rejects(db.query(`insert into news(title,body) values ('bad','bad')`))
    assert.equal((await db.query(`update news set is_published=true where id=$1 returning id`,[id])).rows.length,0)
    await db.exec(`set request.jwt.claims = '{"app_metadata":{"news_editor":true}}';`)
    await db.query('update news set is_published=true where id=$1',[id])
    await db.exec(`reset role; set role anon; set request.jwt.claims = '{}';`)
    assert.equal((await db.query('select * from news where id=$1',[id])).rows.length,1)
    await assert.rejects(db.query('update news set title=$1 where id=$2',['bad',id]))
    await db.exec(`reset role; set role authenticated; set request.jwt.claims = '{}';`)
    assert.equal((await db.query('update news set title=$1 where id=$2 returning id',['bad',id])).rows.length,0)
    await db.exec(`set request.jwt.claims = '{"app_metadata":{"news_editor":true}}';`)
    await assert.rejects(db.query('delete from news where id=$1',[id]))
    await assert.rejects(db.query(`insert into news(title,body,title_en) values ('test','body','partial')`))
    const {rows:[current]} = await db.query('select updated_at::text from news where id=$1',[id])
    assert.notEqual(String(current.updated_at), String(created.updated_at))
    assert.equal((await db.query('update news set title=$1 where id=$2 and updated_at=$3 returning id',['stale',id,created.updated_at])).rows.length,0)
    await db.query('update news set is_published=false where id=$1',[id])
    await db.exec(`reset role; set role anon; set request.jwt.claims = '{}';`)
    assert.equal((await db.query('select * from news where id=$1',[id])).rows.length,0)
  } finally { await db.close() }
})
