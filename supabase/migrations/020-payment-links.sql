-- Migration 020 — pay by link.
--
-- A specialist generates a link for an amount owed; the customer pays on the
-- payment provider's own hosted page. No card detail ever reaches this
-- application, and nothing here can charge anyone: a row is a request for
-- money, and the money is only recorded once the provider itself confirms it.
--
-- A provider's callback carries no signature, so it is treated as a prompt,
-- never as proof. On a callback we look the row up by our own invoice id and
-- then ask the provider, with our own credentials, whether it was really
-- paid. `verified_at` is only set by that second answer.
--
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists payment_links (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),

  -- What the money is for. 'quote' today; booking requests can follow.
  scope        text not null default 'quote',
  quote_id     bigint references quotes(id) on delete set null,
  -- The instalment this pays, when it pays one.
  payment_id   bigint references quote_payments(id) on delete set null,

  -- Our reference, sent as the gateway's invoice_id and returned on callback.
  invoice_id   text not null unique,
  amount       numeric not null,
  currency     text not null default 'AED',

  customer_name   text,
  customer_email  text,
  customer_mobile text,

  -- What the gateway gave back.
  txn_id       text,
  -- The encrypted transaction id from the link; what a status check needs.
  encrypted_id text,
  url          text,
  expires_at   timestamptz,

  -- created → paid | failed | expired. Only the gateway can make it 'paid'.
  status       text not null default 'created',
  paid_at      timestamptz,
  gateway_payment_id text,
  -- Set only when the gateway confirmed the payment to us directly.
  verified_at  timestamptz,
  last_checked_at timestamptz,

  created_by   text,
  -- Whatever the gateway said, kept whole for a dispute.
  raw          jsonb
);

create index if not exists payment_links_quote_idx on payment_links (quote_id, created_at desc);
create index if not exists payment_links_status_idx on payment_links (status);

-- Service role only; nothing here is public.
alter table payment_links enable row level security;
