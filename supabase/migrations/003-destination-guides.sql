-- Migration 003 — destination guides (intro, when to travel, culture)
-- Run in the Supabase SQL editor. Safe to re-run.

alter table destinations add column if not exists intro jsonb not null default '[]';
alter table destinations add column if not exists when_to_travel jsonb not null default '[]';
alter table destinations add column if not exists culture jsonb not null default '[]';
