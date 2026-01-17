-- 03_add_content_hash_and_unique.sql
-- 目的:
-- - 差分更新（upsert）の衝突キーとして content_hash を追加
-- - content_hash に unique index を作成

alter table public.furubira_info
add column if not exists content_hash text;

create unique index if not exists furubira_info_content_hash_uidx
on public.furubira_info (content_hash);


