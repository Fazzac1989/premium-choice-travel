-- Migration 005 — reusable hotels & experiences, linkable to journey stages
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists hotels (
  id             bigint generated always as identity primary key,
  destination_id bigint references destinations(id) on delete cascade,
  name           text not null,
  area           text,
  style          text,
  description    text,
  image          text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists experiences (
  id             bigint generated always as identity primary key,
  destination_id bigint references destinations(id) on delete cascade,
  title          text not null,
  body           text,
  image          text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

alter table hotels enable row level security;
alter table experiences enable row level security;

drop policy if exists "public read hotels" on hotels;
create policy "public read hotels" on hotels for select using (true);
drop policy if exists "public read experiences" on experiences;
create policy "public read experiences" on experiences for select using (true);
