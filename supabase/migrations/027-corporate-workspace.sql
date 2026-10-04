-- 027: Premium Choice Corporate client workspace (2026-10-04).
--
-- A managed travel programme per client company: who may travel, request,
-- approve and see finance; their entities and cost centres; versioned travel
-- policy; trips with immutable offer revisions, approvals tied to one exact
-- offer, bookings, invoices and credit notes, refund claims, airline credits,
-- and an audit trail.
--
-- Every row carries company_id. The app reads and writes only through the
-- service role and scopes every query to the signed-in member's company in
-- code (lib/corporate/workspace/repo.ts); RLS is on with no policies, so the
-- anon and authenticated keys can read nothing here directly.
--
-- Money is integer minor units (fils) in the billing currency, AED by default.
-- A booking may also record what the supplier charged in its own currency and
-- the rate used. Safe to re-run.

create table if not exists corp_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_currency text not null default 'AED',
  -- How far a booked price may exceed the approved quote before the trip
  -- needs approving again, in basis points (500 = 5%).
  price_tolerance_bps integer not null default 0 check (price_tolerance_bps between 0 and 5000),
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists corp_entities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  name text not null,
  tax_number text,
  created_at timestamptz not null default now()
);
create index if not exists corp_entities_company_idx on corp_entities (company_id);

-- A person at the client. Matched to a sign-in by email; user_id is claimed
-- the first time they sign in with that verified address.
create table if not exists corp_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  full_name text not null,
  roles text[] not null default '{traveller}',
  -- The most this person may approve for one trip; null = no limit.
  approval_limit_minor bigint,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);
create index if not exists corp_members_user_idx on corp_members (user_id);
create index if not exists corp_members_email_idx on corp_members (lower(email));

create table if not exists corp_cost_centres (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  entity_id uuid references corp_entities (id) on delete set null,
  code text not null,
  name text not null,
  kind text not null default 'department' check (kind in ('department', 'project')),
  client_name text,
  billable boolean not null default false,
  budget_minor bigint,
  period_start date,
  period_end date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

-- Policy versions are never edited: a change is a new version, so a booking
-- can always show the rules that applied when it was approved.
create table if not exists corp_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  version integer not null,
  summary text not null,
  rules jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (company_id, version)
);

create table if not exists corp_trips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  ref text not null unique,
  traveller_member_id uuid not null references corp_members (id),
  requested_by_member_id uuid references corp_members (id),
  entity_id uuid references corp_entities (id),
  cost_centre_id uuid references corp_cost_centres (id),
  purpose text not null,
  origin text not null,
  destination text not null,
  depart_on date not null,
  return_on date,
  notes text,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now()
);
create index if not exists corp_trips_company_idx on corp_trips (company_id, created_at desc);

-- An offer revision is immutable once sent. Withdrawing it is the only change.
create table if not exists corp_offers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  trip_id uuid not null references corp_trips (id) on delete cascade,
  revision integer not null,
  label text not null,
  details text not null,
  total_minor bigint not null check (total_minor >= 0),
  currency text not null default 'AED',
  change_terms text,
  refund_terms text,
  expires_at timestamptz not null,
  policy_version integer,
  in_policy boolean not null default true,
  policy_note text,
  recommended boolean not null default false,
  withdrawn_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (trip_id, revision)
);
create index if not exists corp_offers_trip_idx on corp_offers (trip_id);

create table if not exists corp_approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  trip_id uuid not null references corp_trips (id) on delete cascade,
  offer_id uuid not null references corp_offers (id),
  approver_member_id uuid not null references corp_members (id),
  decision text not null check (decision in ('approved', 'declined')),
  amount_minor bigint not null,
  currency text not null,
  policy_version integer,
  comment text,
  created_at timestamptz not null default now()
);
-- One decision per offer revision: a double click cannot approve twice.
create unique index if not exists corp_approvals_offer_uniq on corp_approvals (offer_id);

create table if not exists corp_bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  trip_id uuid not null references corp_trips (id) on delete cascade,
  approval_id uuid references corp_approvals (id),
  kind text not null check (kind in ('flight', 'hotel', 'transfer', 'car', 'rail', 'visa', 'other')),
  supplier text not null,
  supplier_ref text not null,
  description text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'AED',
  source_amount_minor bigint,
  source_currency text,
  fx_rate numeric,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  cancel_supplier_ref text,
  cancel_penalty_minor bigint,
  -- Idempotency: the form's one-time action id. A retried submit cannot book twice.
  action_id uuid not null unique,
  created_by uuid,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index if not exists corp_bookings_trip_idx on corp_bookings (trip_id);

create table if not exists corp_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  trip_id uuid references corp_trips (id) on delete set null,
  booking_id uuid references corp_bookings (id) on delete set null,
  entity_id uuid references corp_entities (id),
  kind text not null check (kind in ('invoice', 'credit_note')),
  number text not null,
  issued_on date not null,
  amount_minor bigint not null check (amount_minor >= 0),
  tax_minor bigint not null default 0 check (tax_minor >= 0),
  currency text not null default 'AED',
  status text not null default 'issued' check (status in ('issued', 'paid', 'disputed')),
  created_at timestamptz not null default now(),
  unique (company_id, kind, number)
);
create index if not exists corp_invoices_company_idx on corp_invoices (company_id, issued_on desc);

-- A refund moves claimed → authorised → received; each step is its own fact.
create table if not exists corp_refund_claims (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  trip_id uuid references corp_trips (id) on delete set null,
  booking_id uuid references corp_bookings (id) on delete set null,
  supplier text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'AED',
  status text not null default 'claimed' check (status in ('claimed', 'authorised', 'received', 'rejected')),
  claimed_on date not null default current_date,
  received_on date,
  received_minor bigint,
  note text,
  created_at timestamptz not null default now()
);

-- Unused airline value. Conditional and personal: not cash, not transferable
-- unless the airline says so.
create table if not exists corp_travel_credits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references corp_companies (id) on delete cascade,
  member_id uuid not null references corp_members (id),
  airline text not null,
  ticket_number text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'AED',
  expires_on date not null,
  restrictions text,
  status text not null default 'available' check (status in ('available', 'applied', 'expired')),
  applied_trip_id uuid references corp_trips (id),
  created_at timestamptz not null default now()
);

create table if not exists corp_audit_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references corp_companies (id) on delete cascade,
  trip_id uuid references corp_trips (id) on delete set null,
  actor_user_id uuid,
  actor_label text not null,
  actor_kind text not null check (actor_kind in ('client', 'staff')),
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists corp_audit_company_idx on corp_audit_events (company_id, created_at desc);

-- Trip references: PCC-<year>-<sequence>.
create sequence if not exists corp_trip_ref_seq;

alter table corp_companies enable row level security;
alter table corp_entities enable row level security;
alter table corp_members enable row level security;
alter table corp_cost_centres enable row level security;
alter table corp_policies enable row level security;
alter table corp_trips enable row level security;
alter table corp_offers enable row level security;
alter table corp_approvals enable row level security;
alter table corp_bookings enable row level security;
alter table corp_invoices enable row level security;
alter table corp_refund_claims enable row level security;
alter table corp_travel_credits enable row level security;
alter table corp_audit_events enable row level security;

create or replace function corp_next_trip_ref() returns text
language sql as $$
  select 'PCC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('corp_trip_ref_seq')::text, 4, '0')
$$;
