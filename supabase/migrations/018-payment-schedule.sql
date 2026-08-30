-- Migration 018 — payment schedules on quotes.
--
-- What a customer actually asks after seeing a price: how much now, how much
-- later, and when. A quote that answers that converts; one that does not
-- produces an email exchange.
--
-- This records the plan and what has been received against it. It does NOT
-- take payments and holds nothing that could — no card details, no tokens.
-- When a payment provider is connected, a link and a reference attach to the
-- instalment rows that already exist here.
--
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists quote_payments (
  id          bigserial primary key,
  quote_id    bigint not null references quotes(id) on delete cascade,
  sort_order  int not null default 0,

  -- "Deposit", "Balance", "Second instalment".
  label       text not null,
  amount      numeric not null default 0,
  due_date    date,

  -- Marked by a specialist when the money arrives. Nothing automatic yet.
  paid_at     timestamptz,
  -- "Bank transfer", "Card", "Cash" — how it actually came in.
  method      text,
  reference   text,
  notes       text,

  created_at  timestamptz not null default now()
);

create index if not exists quote_payments_quote_idx on quote_payments (quote_id, sort_order);

-- Read through the service role; the customer sees their schedule rendered on
-- the quote, never by querying this directly.
alter table quote_payments enable row level security;
