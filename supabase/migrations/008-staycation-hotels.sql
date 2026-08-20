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
