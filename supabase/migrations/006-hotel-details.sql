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
