-- Migration 012 — rough price band for each staycation hotel.
--
-- Not a rate. A band answers the only question a visitor can't currently
-- answer — "is this place even in my range?" — without pretending to quote a
-- price we haven't confirmed. 1 is the cheapest band, 4 the most expensive;
-- the labels live in lib/price-bands.ts so they can be reworded without a
-- database change.
--
-- price_guide stays as it was: free text for a fuller seasonal note.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists price_band int;

alter table hotels drop constraint if exists hotels_price_band_check;
alter table hotels add constraint hotels_price_band_check
  check (price_band is null or price_band between 1 and 4);
