# Premium Choice Travel — website & quote platform

A visual, tailor-made travel website with a full admin back office: load packages,
build itemised quotes with markup, and share them as personal links or branded PDFs.

Built with Next.js 14, Tailwind CSS, Supabase and @react-pdf/renderer — the same
stack and design language as the Premium Choice School Trips platform.

## What's inside

| Area | URL | Notes |
| --- | --- | --- |
| Public website | `/` | Home, destinations, packages, about, contact |
| Client quote page | `/quotes/<token>` | Personal link clients receive; includes PDF download |
| Admin console | `/admin` | Dashboard, packages, destinations, quotes, enquiries |
| Quote PDF | `/api/quotes/pdf?token=…` | Branded A4 PDF, streamed on demand |

The public site works **even before Supabase is configured** — it falls back to the
built-in sample catalogue (`lib/sample-data.ts`), so a fresh Vercel deploy is never empty.
The admin requires Supabase.

## Setup (once, ~10 minutes)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. In **SQL Editor**, paste and run the whole of `supabase/schema.sql`.
3. From **Settings → API**, copy the Project URL, `anon` key and `service_role` key.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the Supabase values.
On Vercel, add the same variables under **Project → Settings → Environment Variables**
(set `NEXT_PUBLIC_SITE_URL` to your live domain).

### 3. Seed the admin login and starter catalogue

```bash
npm install
npm run seed
```

This creates the admin user (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`)
and loads 7 destinations + 9 sample packages. Safe to re-run.

### 4. Run

```bash
npm run dev
```

Site at http://localhost:3000 · admin at http://localhost:3000/admin

### 5. Email (optional)

Create a free [resend.com](https://resend.com) key and set `RESEND_API_KEY` /
`RESEND_FROM` to enable "Email quote to client" and enquiry notifications.
Without it, everything still works — you copy quote links manually.

## Everyday workflow

1. **Packages** — Admin → Packages → New. Draft until you tick *Published*.
2. **Quotes** — Admin → Quotes → New → pick a package (pre-fills itinerary, images,
   inclusions) → add price lines (cost + markup %; the client only ever sees the sell
   price) → Save → **Email quote to client** or copy the share link / PDF.
3. **Enquiries** — website forms land in Admin → Enquiries; move them new → contacted → closed.

## Deploy

Push to `main` — Vercel builds automatically. Remember the environment variables
(step 2) the first time.
