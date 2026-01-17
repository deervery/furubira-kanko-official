-- 05_create_match_furubira_info_rpc.sql
-- 目的:
-- - ベクトル類似検索をRPC（Postgres関数）として固定し、アプリ側は `rpc()` で topK を取得できるようにする
--
-- 前提:
-- - public.furubira_info.embedding が vector(1536)
-- - pgvector extension が有効
-- - cosine検索向けのインデックス（IVFFLAT + vector_cosine_ops）が作成済み

create or replace function public.match_furubira_info(
  query_embedding vector(1536),
  match_count int
)
returns table (
  title text,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select
    fi.title,
    fi.content,
    least(
      1::double precision,
      greatest(0::double precision, 1 - (fi.embedding <=> query_embedding))
    ) as similarity
  from public.furubira_info as fi
  where fi.embedding is not null
  order by fi.embedding <=> query_embedding
  limit greatest(coalesce(match_count, 8), 1);
$$;

grant execute on function public.match_furubira_info(vector(1536), int) to anon, authenticated;


