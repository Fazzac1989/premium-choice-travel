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
