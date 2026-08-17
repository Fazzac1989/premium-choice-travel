-- Migration 002 — brand sections
-- Run in the Supabase SQL editor. Safe to re-run.

alter table packages add column if not exists brand text not null default 'holidays'
  check (brand in ('holidays','golf','cruises','staycations','corporate'));

create index if not exists packages_brand_idx on packages (brand);

-- Existing staycation content moves to its brand
update packages set brand = 'staycations' where category = 'Staycations' and brand = 'holidays';
update packages set brand = 'cruises' where category = 'Cruises' and brand = 'holidays';
