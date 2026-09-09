-- Migration 020 — offers.
--
-- A dated deal a brand site can show: a title, a picture, a "from" price,
-- when it runs until, and where the button goes. An offer belongs to one
-- brand or to all of them; School Trips and Corporate do not show offers.
--
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists offers (
  id           bigserial primary key,
  brand        text not null default 'all'
               check (brand in ('all', 'holidays', 'staycations', 'cruises', 'golf')),
  title        text not null,
  subtitle     text,
  description  text,
  image        text,
  badge        text,                      -- e.g. "Save 20%" or "Early booking"
  price_from   numeric,
  currency     text not null default 'AED',
  price_note   text,                      -- e.g. "per person, 5 nights"
  valid_from   date,
  valid_until  date,
  cta_label    text,
  cta_href     text,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists offers_brand_status_idx on offers (brand, status, sort_order);

alter table offers enable row level security;

-- Published offers are public; everything else goes through the service role.
drop policy if exists "public read published offers" on offers;
create policy "public read published offers" on offers
  for select using (status = 'published');
