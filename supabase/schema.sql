-- Premium Choice Travel — database schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).

-- ─────────────────────────────────────────────── destinations
create table if not exists destinations (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  region      text,
  blurb       text,
  hero_image  text,
  featured    boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────── packages
create table if not exists packages (
  id             bigint generated always as identity primary key,
  slug           text not null unique,
  title          text not null,
  tagline        text,
  destination_id bigint references destinations(id) on delete set null,
  category       text,
  nights         int not null default 0,
  days           int not null default 0,
  price_from     numeric,
  currency       text not null default 'AED',
  hero_image     text,
  gallery        jsonb not null default '[]',
  overview       jsonb not null default '[]',
  highlights     jsonb not null default '[]',
  includes       jsonb not null default '[]',
  excludes       jsonb not null default '[]',
  itinerary      jsonb not null default '[]',
  hotel_name     text,
  board_basis    text,
  featured       boolean not null default false,
  status         text not null default 'draft' check (status in ('draft','published')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────── enquiries
create table if not exists enquiries (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null,
  phone         text,
  package_id    bigint references packages(id) on delete set null,
  package_title text,
  travel_dates  text,
  travellers    text,
  message       text,
  status        text not null default 'new' check (status in ('new','contacted','closed')),
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────── quotes
create table if not exists quotes (
  id                 bigint generated always as identity primary key,
  ref                text not null unique,
  public_token       uuid not null unique default gen_random_uuid(),
  status             text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  title              text not null,
  client_name        text,
  client_email       text,
  client_phone       text,
  package_id         bigint references packages(id) on delete set null,
  travel_dates       text,
  validity           date,
  adults             int,
  children           int,
  notes              text,
  currency           text not null default 'AED',
  default_markup_pct numeric not null default 0,
  hero_image         text,
  images             jsonb not null default '[]',
  itinerary          jsonb not null default '[]',
  inclusions         jsonb not null default '[]',
  exclusions         jsonb not null default '[]',
  terms              jsonb not null default '[]',
  sent_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists quote_lines (
  id          bigint generated always as identity primary key,
  quote_id    bigint not null references quotes(id) on delete cascade,
  sort_order  int not null default 0,
  description text not null,
  qty         numeric not null default 1,
  unit_cost   numeric not null default 0,
  markup_pct  numeric not null default 0
);

-- updated_at maintenance
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists packages_updated_at on packages;
create trigger packages_updated_at before update on packages
  for each row execute function set_updated_at();

drop trigger if exists quotes_updated_at on quotes;
create trigger quotes_updated_at before update on quotes
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────── row level security
-- All reads/writes from the app go through the service-role key on the server,
-- so RLS simply locks everything down for anon/authenticated clients.
alter table destinations enable row level security;
alter table packages     enable row level security;
alter table enquiries    enable row level security;
alter table quotes       enable row level security;
alter table quote_lines  enable row level security;

-- Public content is readable by anyone (harmless, future-proofs client-side reads).
drop policy if exists "public read destinations" on destinations;
create policy "public read destinations" on destinations for select using (true);

drop policy if exists "public read published packages" on packages;
create policy "public read published packages" on packages for select using (status = 'published');
