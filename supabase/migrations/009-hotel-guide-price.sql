-- Migration 009 — admin-entered guide price for staycation hotels.
-- Free text, shown only when set, always labelled as guidance.
-- Run in the Supabase SQL editor. Safe to re-run.

alter table hotels add column if not exists price_guide text;
