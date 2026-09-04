-- Migration 018 — bookings confirmed with the supplier (Hotelbeds) from a
-- booking request, plus the details the voucher needs.
--
-- A specialist confirms each request by hand from the admin ("Confirm with
-- Hotelbeds"); nothing here books on its own. The supplier's reply is kept
-- whole (supplier_booking) so a voucher can be regenerated and a dispute
-- answered without asking the supplier again.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table booking_requests add column if not exists children_ages int[];

-- Who is travelling, as given to the supplier: [{type:'AD'|'CH', name, surname, age}].
alter table booking_requests add column if not exists holder_name     text;
alter table booking_requests add column if not exists holder_surname  text;
alter table booking_requests add column if not exists paxes           jsonb;

-- What the customer must see before confirming, and what we told the supplier.
alter table booking_requests add column if not exists rate_comments   text;
alter table booking_requests add column if not exists supplier_remark text;

-- The last re-check of the rate before confirming: {at, total, net, currency, rateType, comments}.
alter table booking_requests add column if not exists supplier_recheck jsonb;

-- The supplier's booking.
alter table booking_requests add column if not exists supplier_reference    text;
alter table booking_requests add column if not exists supplier_status       text;
alter table booking_requests add column if not exists supplier_booking      jsonb;
alter table booking_requests add column if not exists supplier_hotel        jsonb;
alter table booking_requests add column if not exists supplier_confirmed_at timestamptz;
alter table booking_requests add column if not exists supplier_cancelled_at timestamptz;
alter table booking_requests add column if not exists cancellation_cost     numeric;
alter table booking_requests add column if not exists voucher_sent_at       timestamptz;

create index if not exists booking_requests_supplier_ref_idx on booking_requests (supplier_reference);
