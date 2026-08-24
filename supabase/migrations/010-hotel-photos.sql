-- Migration 010 — real photography for the Staycations hotel directory.
--
-- Photos come from the Google Places API: actual pictures of the actual
-- property, not stock. Google's terms let us keep the place id for good but
-- only cache the rest of the content briefly, so we store the photo handles
-- and refresh them on a schedule — the images themselves are always fetched
-- live through /api/place-photo.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists place_id text;
alter table hotels add column if not exists photos jsonb not null default '[]';
alter table hotels add column if not exists photos_refreshed_at timestamptz;

create index if not exists hotels_place_id_idx on hotels (place_id);
