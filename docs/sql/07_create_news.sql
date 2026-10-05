-- Apply only after review, first to an isolated staging database.
begin;
create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text not null check (char_length(btrim(body)) between 1 and 20000),
  title_en text not null default '' check (char_length(title_en) <= 200),
  body_en text not null default '' check (char_length(body_en) <= 20000),
  published_on date not null default (now() at time zone 'Asia/Tokyo')::date,
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint news_complete_english check ((btrim(title_en) = '') = (btrim(body_en) = ''))
);
create index news_public_date on public.news (published_on desc, id desc) where is_published;
create function public.news_set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end;
$$;
create trigger news_updated_at before update on public.news for each row execute function public.news_set_updated_at();
alter table public.news enable row level security;
revoke all on public.news from anon, authenticated;
grant select on public.news to anon, authenticated;
grant insert, update on public.news to authenticated;
create policy news_public_read on public.news for select to anon, authenticated using (is_published);
-- app_metadata can only be changed with trusted admin credentials, unlike user_metadata.
create policy news_editor_read on public.news for select to authenticated
  using (auth.jwt()->'app_metadata'->>'news_editor' = 'true');
create policy news_editor_insert on public.news for insert to authenticated
  with check (auth.jwt()->'app_metadata'->>'news_editor' = 'true');
create policy news_editor_update on public.news for update to authenticated
  using (auth.jwt()->'app_metadata'->>'news_editor' = 'true')
  with check (auth.jwt()->'app_metadata'->>'news_editor' = 'true');
commit;
