-- Migration 011 — drive time from Dubai, in minutes.
--
-- The written directions stay in transfer_duration; this is the number behind
-- them so people can filter the directory the way they actually think about a
-- weekend: "under an hour" rather than "Ras Al Khaimah".
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists drive_minutes int;
