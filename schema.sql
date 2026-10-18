-- Master Thai Parts & Accessories — Supabase schema
-- Run once in the Supabase SQL Editor.

-- 1) Parts table. Same columns as the original site: id, name, description, category.
--    "section" is which of the six pages the part belongs to (brake, engine, ...).
create table if not exists public.parts (
  id           bigint generated always as identity primary key,
  section      text not null check (section in
                 ('brake','engine','exhaust','fuel','suspension','transmission')),
  name         text not null check (char_length(name) between 1 and 100),
  description  text not null default '' check (char_length(description) <= 200),
  category     text not null default '' check (char_length(category) <= 60),
  created_at   timestamptz not null default now()
);

create index if not exists parts_section_idx on public.parts (section);

-- 2) Row Level Security: only signed-in staff can read or change parts.
alter table public.parts enable row level security;

create policy "staff read parts"   on public.parts for select to authenticated using (true);
create policy "staff insert parts" on public.parts for insert to authenticated with check (true);
create policy "staff delete parts" on public.parts for delete to authenticated using (true);

-- 3) Username check, so the login can say "Username not found" vs "Incorrect password"
--    (same messages as the original login.php). Usernames are stored in Supabase Auth
--    as <username>@masterthaiparts.app — see README.
create or replace function public.username_exists(u text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(u) || '@masterthaiparts.app'
  );
$$;

revoke all on function public.username_exists(text) from public;
grant execute on function public.username_exists(text) to anon, authenticated;

-- 4) Optional: import your old MySQL parts.
--    Export each table to CSV (columns name, description, category), then in
--    Table Editor → parts → Import CSV, adding a "section" value per row.
