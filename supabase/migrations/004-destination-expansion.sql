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
