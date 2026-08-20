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
