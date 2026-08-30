-- Migration 015 — customer accounts.
--
-- SECURITY, READ THIS FIRST.
--
-- Until now every account in this Supabase project belonged to Premium Choice
-- staff, so the admin panel could treat "has a session" as "is an admin".
-- Letting customers sign up breaks that assumption completely: without the
-- role column below, the first customer to register would be able to open the
-- admin panel.
--
-- So every account now carries a role. Everyone who already has an account is
-- staff and is marked admin; everyone who signs up from here on is a customer,
-- and the admin guard checks the role rather than the session.
--
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  role        text not null default 'customer',
  created_at  timestamptz not null default now()
);

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('customer', 'admin'));

-- Existing accounts are staff — nobody else has ever been able to sign in.
insert into profiles (id, email, role)
select id, coalesce(email, ''), 'admin' from auth.users
on conflict (id) do nothing;

-- Every new signup gets a profile, defaulting to customer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A customer reads their own profile and nothing else. Staff tooling uses the
-- service role, which bypasses this.
alter table profiles enable row level security;
drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (auth.uid() = id);

-- Link what a customer has already sent us. Filled in on submit when they are
-- signed in; historical rows are matched on their verified email address.
alter table enquiries add column if not exists customer_id uuid references auth.users(id) on delete set null;
alter table booking_requests add column if not exists customer_id uuid references auth.users(id) on delete set null;

create index if not exists enquiries_customer_idx on enquiries (customer_id);
create index if not exists booking_requests_customer_idx on booking_requests (customer_id);
create index if not exists enquiries_email_idx on enquiries (lower(email));
create index if not exists booking_requests_email_idx on booking_requests (lower(email));
