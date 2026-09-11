-- Migration 021 — payment links against a booking request.
--
-- The Staycations flow becomes: a specialist confirms the room with the
-- supplier, the customer is sent a link to pay, and the voucher follows the
-- money rather than the booking. Until this runs, confirming still emails the
-- voucher straight away, exactly as before.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table payment_links add column if not exists booking_request_id bigint references booking_requests(id) on delete set null;

create index if not exists payment_links_booking_idx on payment_links (booking_request_id, created_at desc);

-- When the voucher went out, so a second payment notice cannot send it twice.
alter table booking_requests add column if not exists payment_link_id bigint references payment_links(id) on delete set null;
alter table booking_requests add column if not exists paid_at timestamptz;
