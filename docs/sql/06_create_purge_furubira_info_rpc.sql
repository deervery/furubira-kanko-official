-- 06_create_purge_furubira_info_rpc.sql
-- 目的:
-- - ingest を繰り返したときに「元データから消えたチャンク」がDBに残らないようにする
-- - URLクエリの長さ制限を避けるため、text[]（keep_hashes）を受け取ってサーバー側で削除する
--
-- 注意:
-- - 本関数は DELETE を実行します。必ず service role key（= service_role）でのみ実行してください。
-- - content_hash が NULL の旧データは対象外（誤削除防止）。必要なら別途クレンジングしてください。

create or replace function public.purge_furubira_info_not_in_hashes(
  keep_hashes text[]
)
returns bigint
language plpgsql
security definer
as $$
declare
  deleted_count bigint;
begin
  delete from public.furubira_info
  where content_hash is not null
    and not (content_hash = any(keep_hashes));

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_furubira_info_not_in_hashes(text[]) from public;
grant execute on function public.purge_furubira_info_not_in_hashes(text[]) to service_role;


