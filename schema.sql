-- Master Thai Parts & Accessories — Supabase schema
-- Run this in the Supabase SQL Editor.

create table if not exists public.parts (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sku         text not null,
  name        text not null,
  category    text not null check (category in
                ('Brake Parts','Engine Parts','Exhaust System','Fuel System','Suspension')),
  brand       text default '',
  price       numeric(12,2) not null check (price >= 0),
  stock       integer not null check (stock >= 0),
  min_stock   integer not null default 5 check (min_stock >= 0),
  notes       text default '',
  created_at  timestamptz not null default now(),
  unique (owner, sku)
);

create index if not exists parts_owner_idx on public.parts (owner);

-- Row Level Security: each signed-in user only sees and edits their own parts.
alter table public.parts enable row level security;

create policy "read own parts"   on public.parts for select using (auth.uid() = owner);
create policy "insert own parts" on public.parts for insert with check (auth.uid() = owner);
create policy "update own parts" on public.parts for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "delete own parts" on public.parts for delete using (auth.uid() = owner);
