-- Migration 013 — live rate lookups for the Staycations directory.
--
-- Two pieces:
--
-- supplier_code maps one of our hotels to the same property in a bed bank's
-- catalogue. Nullable: a hotel without one simply never quotes, which is how
-- the feature stays off until each property is deliberately mapped.
--
-- rate_cache exists for a commercial reason as much as a technical one. Bed
-- banks watch the ratio of searches to bookings and throttle or cancel
-- contracts over a bad one, and a site that prices every visitor but books
-- offline is exactly the bad case. Caching a quote per hotel/date/occupancy
-- means a hundred people looking at the same weekend costs one search.
--
-- A cached row with amount = null is a real answer: the supplier had nothing.
-- Storing it stops us asking again for every visitor.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists supplier_code text;
create index if not exists hotels_supplier_code_idx on hotels (supplier_code);

create table if not exists rate_cache (
  id          bigserial primary key,
  hotel_id    int not null references hotels(id) on delete cascade,
  check_in    date not null,
  nights      int not null,
  adults      int not null,
  children    int not null default 0,
  currency    text not null default 'AED',
  -- null means the supplier returned nothing for these dates.
  amount      numeric,
  board       text,
  room_name   text,
  provider    text not null,
  fetched_at  timestamptz not null default now(),
  unique (hotel_id, check_in, nights, adults, children)
);

create index if not exists rate_cache_fetched_idx on rate_cache (fetched_at);

-- Read through the service role only; nothing here is public.
alter table rate_cache enable row level security;
