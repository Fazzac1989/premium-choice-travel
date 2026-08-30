-- Migration 016 — quotes belong to a customer, and to the request that started them.
--
-- The quote builder already existed but had no idea who a quote was for beyond
-- a typed-in email address, so a customer signing in could not see the quote we
-- had sent them. customer_id fixes that, and is filled the same way as
-- enquiries: directly when we know the account, otherwise claimed on the
-- customer's verified email the first time they sign in.
--
-- booking_request_id records which request a quote answers, so a specialist
-- opening a quote can see the room and price the customer was originally
-- shown, and the request can show that it has been quoted.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table quotes add column if not exists customer_id uuid references auth.users(id) on delete set null;
alter table quotes add column if not exists booking_request_id bigint references booking_requests(id) on delete set null;

create index if not exists quotes_customer_idx on quotes (customer_id);
create index if not exists quotes_email_idx on quotes (lower(client_email));
create index if not exists quotes_booking_request_idx on quotes (booking_request_id);

-- Who is dealing with a request, and where it got to.
alter table booking_requests add column if not exists admin_notes text;
