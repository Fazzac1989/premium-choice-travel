-- 026: Staycations books through the Premium Choice trade platform (founder, 2026-10-02).
--
-- The platform is the engine: prices (with the Staycations markup), the booking, the voucher
-- and the payment. A trip on this site is still a booking_requests row; these columns link it
-- to the platform's checkout and booking. A hotel's supplier_code now holds its id in the
-- platform's catalogue (a uuid); the Hotelbeds code it held before is kept in hotelbeds_code.
-- Safe to re-run.

alter table booking_requests add column if not exists platform_checkout_id text;
alter table booking_requests add column if not exists platform_booking_id  text;
create index if not exists booking_requests_platform_checkout_idx on booking_requests (platform_checkout_id);

alter table hotels add column if not exists hotelbeds_code text;
update hotels set hotelbeds_code = supplier_code
 where hotelbeds_code is null and supplier_code ~ '^[0-9]+$';
