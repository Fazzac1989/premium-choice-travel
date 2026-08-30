-- Migration 014 — booking requests, and room-level offers in the rate cache.
--
-- A booking request is not a booking. The customer picks a room and asks for
-- it; a specialist confirms availability and price and comes back. So this
-- table records what they saw at the moment they asked — room, board, price,
-- the supplier's offer id — which is what lets a specialist pick up exactly
-- the rate the customer was looking at, or explain honestly why it moved.
--
-- net_amount is our cost. It is stored for the specialist and never leaves
-- the server.
--
-- rate_cache gains the full offer list so the price a customer submits is
-- re-read from the server rather than trusted from the browser.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table rate_cache add column if not exists offers jsonb;
alter table rate_cache add column if not exists offers_fetched_at timestamptz;

create table if not exists booking_requests (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),

  hotel_id     int references hotels(id) on delete set null,
  hotel_name   text not null,
  emirate      text,

  check_in     date not null,
  nights       int not null,
  adults       int not null,
  children     int not null default 0,

  room_name    text,
  board        text,
  refundable   boolean,
  cancel_by    text,

  currency     text not null default 'AED',
  -- What the customer was shown.
  amount       numeric not null,
  -- Our cost, for the specialist only.
  net_amount   numeric,
  -- Fees the supplier says are payable at the hotel, not in the price.
  extra_fees   text,

  offer_id     text,
  provider     text,

  name         text not null,
  email        text not null,
  phone        text,
  channel      text,
  notes        text,

  status       text not null default 'new'
);

create index if not exists booking_requests_created_idx on booking_requests (created_at desc);
create index if not exists booking_requests_status_idx on booking_requests (status);

-- Service role only; nothing here is public.
alter table booking_requests enable row level security;
