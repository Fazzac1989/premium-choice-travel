-- Migration 024 — hotels have a country, and the directory has its own flag.
--
-- `emirate` was doing three jobs at once: the country, the region inside it,
-- and — through `emirate is not null` — the test for whether a hotel belongs
-- to the Staycations directory at all. That third job is why an Omani hotel
-- could not simply be added: give it a region and it is not an emirate, leave
-- the column empty and it disappears from the directory.
--
-- So the country becomes its own column, and it becomes the membership test.
-- `emirate` stays exactly where it is, still holding the region, because it
-- is the name in the URL, on every booking request and on every voucher
-- already issued. Renaming it would break links customers hold.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists country text;

-- Every hotel in the directory today is in the UAE, by definition.
update hotels set country = 'United Arab Emirates'
where country is null and emirate is not null and emirate <> '';

create index if not exists hotels_country_idx on hotels (country) where country is not null;

-- The booking request already copies the region; it copies the country too,
-- so a record stays readable when the directory changes underneath it.
alter table booking_requests add column if not exists country text;

update booking_requests set country = 'United Arab Emirates'
where country is null and emirate is not null and emirate <> '';
