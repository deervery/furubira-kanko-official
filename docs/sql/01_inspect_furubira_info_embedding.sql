-- 01_inspect_furubira_info_embedding.sql
-- 目的:
-- - pgvectorが有効か確認
-- - furubira_info.embedding の「型」と「vector次元」を確認
-- 使い方:
-- - Supabase SQL Editorで実行し、結果を見て次のSQLへ進む

-- 1) pgvector (vector extension) が入っているか
select
  extname,
  extversion
from pg_extension
where extname = 'vector';

-- 2) テーブル/カラムの型を確認（見つからない場合は列名が違う可能性あり）
select
  table_schema,
  table_name,
  column_name,
  data_type,
  udt_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'furubira_info'
  and column_name = 'embedding';

-- 3) vectorの場合、次元（typmod）を確認
-- - vector(N) の N は typmod に入っていることが多い（概ね atttypmod - 4）
-- - ここがNULL/負数なら「型がvectorではない」or「typmodが取れない」可能性
select
  n.nspname as schema,
  c.relname as table,
  a.attname as column,
  t.typname as pg_type,
  format_type(a.atttypid, a.atttypmod) as formatted_type,
  case
    when t.typname = 'vector' and a.atttypmod > 0 then a.atttypmod - 4
    else null
  end as vector_dims
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_type t on t.oid = a.atttypid
where n.nspname = 'public'
  and c.relname = 'furubira_info'
  and a.attname = 'embedding'
  and a.attnum > 0
  and not a.attisdropped;


