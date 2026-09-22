-- Migration 025 — brochures built from packages.
--
-- School Trips has a brochure maker: a deck of A4 pages that reads on screen
-- and prints to a PDF. That one is built from trips and lives in the School
-- Trips database. This is the same machine built from `packages`, so the brand
-- sites in this codebase can have one too.
--
-- Golf Holidays is the first to use it, which is why `brand` defaults to golf,
-- but nothing here is golf-specific: the column is the same brand list the
-- offers table uses, so Holidays or Cruises can have brochures later without a
-- second set of tables.
--
-- Unlike the School Trips version there is no client: a golf brochure is a
-- collection Premium Choice publishes, not a document prepared for one school,
-- so there is no client name, no crest and no per-client invite.
--
-- Run in the Supabase SQL editor. Safe to re-run.

create table if not exists package_brochures (
  id               bigserial primary key,
  slug             text not null unique,
  brand            text not null default 'golf'
                   check (brand in ('holidays', 'staycations', 'cruises', 'golf', 'corporate')),
  title            text not null,
  subtitle         text,
  status           text not null default 'draft'
                   check (status in ('draft', 'published', 'archived')),
  visibility       text not null default 'public'
                   check (visibility in ('public', 'unlisted')),
  cover_image      text,
  intro_text       text,
  closing_text     text,
  -- Cover theme, document theme, and which standard pages are included.
  design           jsonb not null default '{}'::jsonb,
  -- The packages in the brochure, in the order they were arranged.
  package_ids      bigint[] not null default '{}',
  seo_title        text,
  seo_description  text,
  -- The rendered PDF is cached rather than built on every download.
  pdf_storage_path text,
  pdf_generated_at timestamptz,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists package_brochures_brand_status_idx
  on package_brochures (brand, status, updated_at desc);

-- One row per page. A page either belongs to a package or is a standard page
-- (cover, contents, contact) that belongs to the brochure itself.
create table if not exists package_brochure_pages (
  id           bigserial primary key,
  brochure_id  bigint not null references package_brochures (id) on delete cascade,
  sort_order   int not null default 0,
  page_type    text not null
               -- Named for packages, not trips: a golf page is an introduction,
               -- the courses, the day-by-day, and why this destination.
               check (page_type in (
                 'cover', 'brandIntroduction', 'contents', 'textEditorial',
                 'destinationDivider', 'packageIntro', 'packageCourses',
                 'packageItinerary', 'packageWhy', 'packageGallery',
                 'howItWorks', 'callToAction', 'contact', 'backCover'
               )),
  -- Null on a standard page. Set null rather than deleted if a package goes,
  -- so the brochure keeps its shape and the gap is visible in the studio.
  package_id   bigint references packages (id) on delete set null,
  -- The composed copy for this page: headline, body, highlights, price and so on.
  content      jsonb not null default '{}'::jsonb,
  -- Turned off in the studio without being deleted.
  hidden       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists package_brochure_pages_brochure_idx
  on package_brochure_pages (brochure_id, sort_order);

alter table package_brochures enable row level security;
alter table package_brochure_pages enable row level security;

-- A published, public brochure is readable by anyone; drafts, archived and
-- unlisted ones are reached through the service role, which is what the page
-- route uses so it can apply its own rules.
drop policy if exists "public read published brochures" on package_brochures;
create policy "public read published brochures" on package_brochures
  for select using (status = 'published' and visibility = 'public');

drop policy if exists "public read pages of published brochures" on package_brochure_pages;
create policy "public read pages of published brochures" on package_brochure_pages
  for select using (
    exists (
      select 1 from package_brochures b
      where b.id = package_brochure_pages.brochure_id
        and b.status = 'published'
        and b.visibility = 'public'
    )
  );

-- The rendered PDFs. Private: the download route hands out a signed URL after
-- it has applied the brochure's own visibility rules.
insert into storage.buckets (id, name, public)
values ('brochure-pdfs', 'brochure-pdfs', false)
on conflict (id) do nothing;
