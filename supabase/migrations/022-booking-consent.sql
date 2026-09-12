-- Migration 022 — what the customer agreed to, recorded with the request.
--
-- Two separate things, because they are two separate decisions:
--
--   * `terms_accepted_at` is required to send a request at all. It records
--     when they ticked, so a dispute can be answered with a timestamp rather
--     than an assumption.
--   * `marketing_opt_in` is optional and must stay optional. Consent to be
--     emailed offers has to be freely given and separately given; bundling
--     it into the terms tick makes it worthless as consent and is exactly
--     what data-protection regulators look for.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table booking_requests add column if not exists terms_accepted_at timestamptz;
alter table booking_requests add column if not exists marketing_opt_in boolean not null default false;
alter table booking_requests add column if not exists marketing_opt_in_at timestamptz;

-- Finding everyone who said yes, for an offers send.
create index if not exists booking_requests_marketing_idx
  on booking_requests (marketing_opt_in, created_at desc)
  where marketing_opt_in;
