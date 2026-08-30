-- ─────────────────────────────────────────────────────────────────
-- Premium Choice Travel — pending migrations, combined.
-- Paste ALL of this into Supabase → SQL Editor → New query → Run.
-- Safe to re-run at any time.
-- ─────────────────────────────────────────────────────────────────

-- 002: brand sections on packages
alter table packages add column if not exists brand text not null default 'holidays'
  check (brand in ('holidays','golf','cruises','staycations','corporate'));
create index if not exists packages_brand_idx on packages (brand);
update packages set brand = 'staycations' where category = 'Staycations' and brand = 'holidays';
update packages set brand = 'cruises' where category = 'Cruises' and brand = 'holidays';

-- 003: destination guides
alter table destinations add column if not exists intro jsonb not null default '[]';
alter table destinations add column if not exists when_to_travel jsonb not null default '[]';
alter table destinations add column if not exists culture jsonb not null default '[]';
-- Migration 004 — destination expansion + AI inspiration leads
-- Run in the Supabase SQL editor. Safe to re-run.

alter table destinations add column if not exists strapline text;
alter table destinations add column if not exists tags jsonb not null default '[]';
alter table destinations add column if not exists seasonality jsonb not null default '{"best":[],"good":[],"possible":[]}';
alter table destinations add column if not exists sub_destinations jsonb not null default '[]';
alter table destinations add column if not exists experiences jsonb not null default '[]';
alter table destinations add column if not exists stay jsonb not null default '[]';
alter table destinations add column if not exists journey_ideas jsonb not null default '[]';
alter table destinations add column if not exists gallery jsonb not null default '[]';
alter table destinations add column if not exists priority_rank int not null default 999;
alter table destinations add column if not exists published boolean not null default true;

-- Structured AI Holiday Curator leads (a copy also lands in enquiries for the
-- existing staff workflow — this table keeps the full structured record).
create table if not exists ai_leads (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  source_page   text,
  destination   text,
  departure     text,
  date_window   text,
  duration      text,
  party         text,
  budget_aed    text,
  styles        jsonb not null default '[]',
  priorities    jsonb not null default '[]',
  hotel_pref    text,
  pace          text,
  notes         text,
  concepts      jsonb not null default '[]',
  selected      jsonb,
  customer_name text,
  email         text,
  phone         text,
  channel       text,
  status        text not null default 'new' check (status in ('new','reviewing','contacted','quoting','won','lost'))
);
alter table ai_leads enable row level security;
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
-- Migration 006 — rich hotel pages: intro, features, rooms, dining, transfers, gallery
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists intro jsonb not null default '[]';
alter table hotels add column if not exists features jsonb not null default '[]';
alter table hotels add column if not exists room_types jsonb not null default '[]';
alter table hotels add column if not exists restaurants jsonb not null default '[]';
alter table hotels add column if not exists meal_plans jsonb not null default '[]';
alter table hotels add column if not exists getting_there text;
alter table hotels add column if not exists transfer_duration text;
alter table hotels add column if not exists gallery jsonb not null default '[]';
-- Migration 007 — journey library fields: review workflow, tags, SEO,
-- editorial sections and brand-specific details. Run in the SQL editor. Safe to re-run.

alter table packages drop constraint if exists packages_status_check;
alter table packages add constraint packages_status_check
  check (status in ('draft','review','published'));

alter table packages add column if not exists tags jsonb not null default '[]';
alter table packages add column if not exists who_for jsonb not null default '[]';
alter table packages add column if not exists why_works jsonb not null default '[]';
alter table packages add column if not exists seasonal_notes text;
alter table packages add column if not exists extensions jsonb not null default '[]';
alter table packages add column if not exists details jsonb not null default '{}';
alter table packages add column if not exists seo_title text;
alter table packages add column if not exists seo_description text;
alter table packages add column if not exists price_status text not null default 'on_request'
  check (price_status in ('on_request','approved'));
alter table packages add column if not exists review_note text;
-- Migration 008 — hotel directory fields for Premium Choice Staycations:
-- star rating, emirate, best-for tags, featured flag and publish control.
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists stars int;
alter table hotels add column if not exists emirate text;
alter table hotels add column if not exists best_for jsonb not null default '[]';
alter table hotels add column if not exists featured boolean not null default false;
alter table hotels add column if not exists status text not null default 'published';

alter table hotels drop constraint if exists hotels_status_check;
alter table hotels add constraint hotels_status_check
  check (status in ('draft','published'));
-- Migration 009 — admin-entered guide price for staycation hotels.
-- Free text, shown only when set, always labelled as guidance.
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists price_guide text;

-- Migration 010 — real photography for the Staycations hotel directory.
--
-- Photos come from the Google Places API: actual pictures of the actual
-- property, not stock. Google's terms let us keep the place id for good but
-- only cache the rest of the content briefly, so we store the photo handles
-- and refresh them on a schedule — the images themselves are always fetched
-- live through /api/place-photo.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists place_id text;
alter table hotels add column if not exists photos jsonb not null default '[]';
alter table hotels add column if not exists photos_refreshed_at timestamptz;

create index if not exists hotels_place_id_idx on hotels (place_id);

-- Migration 012 — rough price band for each staycation hotel.
--
-- Not a rate. A band answers the only question a visitor can't currently
-- answer — "is this place even in my range?" — without pretending to quote a
-- price we haven't confirmed. 1 is the cheapest band, 4 the most expensive;
-- the labels live in lib/price-bands.ts so they can be reworded without a
-- database change.
--
-- price_guide stays as it was: free text for a fuller seasonal note.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists price_band int;

alter table hotels drop constraint if exists hotels_price_band_check;
alter table hotels add constraint hotels_price_band_check
  check (price_band is null or price_band between 1 and 4);

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

-- Migration 014 — booking requests, and room-level offers in the rate cache.
--
-- A booking request is not a booking. The customer picks a room and asks for
-- it; a specialist confirms availability and price and comes back. So this
-- table records what they saw at the moment they asked — room, board, price,
-- the supplier's offer id — which is what lets a specialist pick up exactly
-- the rate the customer was looking at, or explain honestly why it moved.
--
-- net_amount is our cost. It is stored for the specialist and never leaves
-- the server.
--
-- rate_cache gains the full offer list so the price a customer submits is
-- re-read from the server rather than trusted from the browser.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table rate_cache add column if not exists offers jsonb;
alter table rate_cache add column if not exists offers_fetched_at timestamptz;

create table if not exists booking_requests (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),

  hotel_id     int references hotels(id) on delete set null,
  hotel_name   text not null,
  emirate      text,

  check_in     date not null,
  nights       int not null,
  adults       int not null,
  children     int not null default 0,

  room_name    text,
  board        text,
  refundable   boolean,
  cancel_by    text,

  currency     text not null default 'AED',
  -- What the customer was shown.
  amount       numeric not null,
  -- Our cost, for the specialist only.
  net_amount   numeric,
  -- Fees the supplier says are payable at the hotel, not in the price.
  extra_fees   text,

  offer_id     text,
  provider     text,

  name         text not null,
  email        text not null,
  phone        text,
  channel      text,
  notes        text,

  status       text not null default 'new'
);

create index if not exists booking_requests_created_idx on booking_requests (created_at desc);
create index if not exists booking_requests_status_idx on booking_requests (status);

-- Service role only; nothing here is public.
alter table booking_requests enable row level security;
