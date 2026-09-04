-- Migration 019 — a "reviewer" role for the admin.
--
-- A reviewer signs in to the admin console but sees and can use only the
-- Booking requests section (list, request page, Hotelbeds panel, voucher).
-- Built for Hotelbeds' certification reviewers; useful for anyone who only
-- handles hotel bookings. Assign with:
--   npx tsx scripts/create-staff.ts <email> <password> reviewer
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('customer', 'admin', 'reviewer'));
