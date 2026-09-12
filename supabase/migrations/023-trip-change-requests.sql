-- Migration 023 — what a customer asks us to do about a booking they have.
--
-- The portal lets someone ask to change or cancel a stay, or ask a question
-- about it. None of those happen by themselves: a cancellation posted to the
-- supplier by a customer click would commit real money against terms they may
-- not have read, and an amendment usually means a different rate entirely.
-- So this table is a queue for a specialist, and the specialist does the work
-- in the admin exactly as they do today.
--
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists booking_change_requests (
  id                  bigserial primary key,
  created_at          timestamptz not null default now(),

  booking_request_id  bigint not null references booking_requests(id) on delete cascade,
  -- Who asked. Null only if the account is later deleted.
  customer_id         uuid references auth.users(id) on delete set null,
  -- Kept alongside the id so a specialist can reply without a join.
  email               text,

  -- 'amend' | 'cancel' | 'question'
  kind                text not null,
  message             text not null,

  -- What the booking's cancellation terms said at the moment they asked, so a
  -- later dispute is answered with what they were shown, not what we assume.
  terms_at_request    text,

  -- new | in_progress | done | declined
  status              text not null default 'new',
  staff_note          text,
  handled_at          timestamptz,
  handled_by          text
);

create index if not exists booking_change_requests_booking_idx
  on booking_change_requests (booking_request_id, created_at desc);

create index if not exists booking_change_requests_open_idx
  on booking_change_requests (status, created_at desc)
  where status = 'new';

-- Service role only; the app reads and writes it on the customer's behalf
-- after checking that the booking is theirs.
alter table booking_change_requests enable row level security;
