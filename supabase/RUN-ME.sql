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
