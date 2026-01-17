-- 02_enable_pgvector_and_ivfflat_index.sql
-- 目的:
-- - pgvector有効化
-- - furubira_info.embedding に IVFFLAT(cosine) インデックス作成
-- - ANALYZE実行
--
-- 前提:
-- - docs/sql/01_inspect_furubira_info_embedding.sql で
--   embedding が vector(N) であることを確認済み

create extension if not exists vector;

-- IVFFLAT (cosine)
-- lists はデータ量により調整（まずは100を推奨）
create index if not exists furubira_info_embedding_ivfflat
on public.furubira_info
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

analyze public.furubira_info;


