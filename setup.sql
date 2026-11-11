-- Nakal: run once in Supabase > SQL Editor.
create table if not exists public.bills (
  id        text primary key,
  party     text not null,
  date      date not null,
  rows      jsonb not null default '[]'::jsonb,
  transport numeric not null default 0,
  total     numeric not null default 0,
  grand     numeric not null default 0,
  saved_at  timestamptz not null default now(),
  saved_by  uuid default auth.uid()
);

alter table public.bills enable row level security;

-- Every signed-in user (you and your staff) shares the same bills.
-- People who are not signed in can read and write nothing.
drop policy if exists "staff share all bills" on public.bills;
create policy "staff share all bills" on public.bills
  for all to authenticated
  using (true) with check (true);
