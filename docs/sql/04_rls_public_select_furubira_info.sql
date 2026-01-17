-- 04_rls_public_select_furubira_info.sql
-- 目的:
-- - furubira_info を「公開SELECTのみ」にする（公開OK前提）
-- 注意:
-- - RLSを有効化すると、policyが無い操作は拒否されます
-- - insert/update/delete を許可したい場合は、別途policyが必要です

alter table public.furubira_info enable row level security;

drop policy if exists "public read furubira_info" on public.furubira_info;

create policy "public read furubira_info"
on public.furubira_info
for select
using (true);


