-- Migration 017 — traveller profiles.
--
-- What a hotel or airline actually needs to hold a booking: the name as it is
-- printed in the passport, a date of birth, a nationality. Nothing more.
--
-- Deliberately NOT an identity-verification store. No document uploads, no
-- scans, no ID images. Passport number and expiry are nullable on purpose so
-- a customer can save a traveller now and add the passport only when a booking
-- needs it — the less of this we hold, and the later we hold it, the better.
--
-- Under UAE personal data law this is personal data and stays that way:
-- row-level security means a customer reaches only their own travellers, and
-- staff read it through the service role, which is audited by Supabase.
--
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists travellers (
  id            bigserial primary key,
  customer_id   uuid not null references auth.users(id) on delete cascade,

  -- Exactly as printed in the passport — the whole point of storing it.
  full_name     text not null,
  -- "Me", "Ayesha", "Youngest" — how the customer thinks of this person.
  label         text,
  date_of_birth date,
  nationality   text,

  -- Added when a booking needs them, not before.
  passport_number    text,
  passport_expiry    date,
  passport_country   text,

  -- Dietary, mobility, frequent flyer — what a specialist should know.
  notes         text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists travellers_customer_idx on travellers (customer_id);

alter table travellers enable row level security;

drop policy if exists "read own travellers" on travellers;
create policy "read own travellers" on travellers for select using (auth.uid() = customer_id);

drop policy if exists "insert own travellers" on travellers;
create policy "insert own travellers" on travellers for insert with check (auth.uid() = customer_id);

drop policy if exists "update own travellers" on travellers;
create policy "update own travellers" on travellers for update using (auth.uid() = customer_id);

drop policy if exists "delete own travellers" on travellers;
create policy "delete own travellers" on travellers for delete using (auth.uid() = customer_id);

-- Which travellers a request is for, so a specialist booking it has the names
-- without asking again.
alter table booking_requests add column if not exists traveller_ids jsonb not null default '[]';
