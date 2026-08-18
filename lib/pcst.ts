import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Direct access to the Premium Choice School Trips platform database, so the
 * Group console manages School Trips content natively — no separate admin.
 * The School Trips public site/teacher portal keep running on their own
 * deployment; this writes to the same database they read from.
 */

export const PCST_SITE_URL = 'https://premiumchoiceschooltrips.com';

export function isPcstConfigured() {
  return Boolean(process.env.PCST_SUPABASE_URL && process.env.PCST_SUPABASE_SERVICE_ROLE_KEY);
}

export function pcstClient() {
  return createClient(
    process.env.PCST_SUPABASE_URL!,
    process.env.PCST_SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) },
    }
  );
}

/* ────────────────────────────── stats ────────────────────────────── */

export type PcstStats = {
  trips: number;
  publishedTrips: number;
  quotes: number;
  appointments: number;
};

export async function getPcstStats(): Promise<PcstStats | null> {
  if (!isPcstConfigured()) return null;
  try {
    const db = pcstClient();
    const [trips, published, quotes, appointments] = await Promise.all([
      db.from('trips').select('id', { count: 'exact', head: true }),
      db.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      db.from('quotes').select('id', { count: 'exact', head: true }),
      db.from('appointment_requests').select('id', { count: 'exact', head: true }),
    ]);
    return {
      trips: trips.count ?? 0,
      publishedTrips: published.count ?? 0,
      quotes: quotes.count ?? 0,
      appointments: appointments.count ?? 0,
    };
  } catch (e: any) {
    console.error('[pcst stats]', e?.message);
    return null;
  }
}

/* ────────────────────────────── trips ────────────────────────────── */

export type StItineraryDay = {
  label: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

export type StTrip = {
  id: number;
  slug: string;
  title: string;
  subjectId: number | null;
  subjectName: string;
  countryId: number | null;
  countryName: string;
  city: string;
  durationDays: number;
  durationNights: number;
  departs: string;
  heroImage: string;
  heroAlt: string;
  gallery: string[];
  overview: string[];
  includes: string[];
  basePricePp: number | null;
  status: string;
  featured: boolean;
  itinerary: StItineraryDay[];
};

const TRIP_SELECT = '*, subjects(id, name), countries(id, name)';

function mapTrip(row: any, days: any[] = []): StTrip {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subjectId: row.subject_id,
    subjectName: row.subjects?.name ?? '',
    countryId: row.country_id,
    countryName: row.countries?.name ?? '',
    city: row.city ?? '',
    durationDays: row.duration_days ?? 0,
    durationNights: row.duration_nights ?? 0,
    departs: row.departs ?? '',
    heroImage: row.hero_image ?? '',
    heroAlt: row.hero_alt ?? '',
    gallery: row.gallery ?? [],
    overview: row.overview ?? [],
    includes: row.includes ?? [],
    basePricePp: row.base_price_pp === null || row.base_price_pp === undefined ? null : Number(row.base_price_pp),
    status: row.status ?? 'draft',
    featured: Boolean(row.featured),
    itinerary: days
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d) => ({
        label: d.label ?? '',
        title: d.title ?? '',
        description: d.description ?? '',
        imageUrl: d.image_url,
        imageAlt: d.image_alt,
      })),
  };
}

export async function listStTrips(): Promise<StTrip[]> {
  const db = pcstClient();
  const { data } = await db.from('trips').select(TRIP_SELECT).order('updated_at', { ascending: false });
  return (data ?? []).map((r) => mapTrip(r));
}

export async function getStTrip(id: number): Promise<StTrip | null> {
  const db = pcstClient();
  const [{ data: trip }, { data: days }] = await Promise.all([
    db.from('trips').select(TRIP_SELECT).eq('id', id).maybeSingle(),
    db.from('itinerary_days').select('*').eq('trip_id', id),
  ]);
  return trip ? mapTrip(trip, days ?? []) : null;
}

export async function listStSubjects(): Promise<{ id: number; name: string }[]> {
  const db = pcstClient();
  const { data } = await db.from('subjects').select('id, name').order('name');
  return data ?? [];
}

export async function listStCountries(): Promise<{ id: number; name: string }[]> {
  const db = pcstClient();
  const { data } = await db.from('countries').select('id, name').order('name');
  return data ?? [];
}

/* ────────────────────────────── quotes ───────────────────────────── */

export type StQuote = {
  id: number;
  ref: string;
  publicToken: string;
  title: string;
  status: string;
  schoolName: string;
  teacherName: string;
  teacherEmail: string;
  travelDates: string;
  validity: string | null;
  pupils: number | null;
  staff: number | null;
  currency: string;
  total: number;
  perStudent: number | null;
  updatedAt: string;
  lines: { description: string; qty: number; unitCost: number; markupPct: number }[];
};

export function stQuoteClientUrl(q: Pick<StQuote, 'publicToken'>) {
  return `${PCST_SITE_URL}/quotes/${q.publicToken}`;
}

function mapStQuote(row: any): StQuote {
  const lines = (row.quote_lines ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((l: any) => ({
      description: l.description,
      qty: Number(l.qty),
      unitCost: Number(l.unit_cost),
      markupPct: Number(l.markup_pct),
    }));
  const total = lines.reduce(
    (s: number, l: any) => s + l.qty * l.unitCost * (1 + l.markupPct / 100),
    0
  );
  return {
    id: row.id,
    ref: row.ref,
    publicToken: row.public_token,
    title: row.title,
    status: row.status,
    schoolName: row.school_name ?? '',
    teacherName: row.teacher_name ?? '',
    teacherEmail: row.teacher_email ?? '',
    travelDates: row.travel_dates ?? '',
    validity: row.validity,
    pupils: row.pupils,
    staff: row.staff,
    currency: row.currency ?? 'AED',
    total,
    perStudent: row.pupils > 0 ? total / row.pupils : null,
    updatedAt: row.published_at ?? row.created_at,
    lines,
  };
}

export async function listStQuotes(): Promise<StQuote[]> {
  const db = pcstClient();
  const { data } = await db
    .from('quotes')
    .select('*, quote_lines(*)')
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapStQuote);
}

export async function getStQuote(id: number): Promise<StQuote | null> {
  const db = pcstClient();
  const { data } = await db.from('quotes').select('*, quote_lines(*)').eq('id', id).maybeSingle();
  return data ? mapStQuote(data) : null;
}

/* ─────────────────────── appointments & enquiries ─────────────────── */

export type StRequest = {
  id: number;
  createdAt: string;
  fields: Record<string, string>;
  status: string | null;
  table: 'appointment_requests' | 'enquiries';
};

const HIDDEN_KEYS = new Set(['id', 'created_at', 'updated_at', 'status']);

function mapRequest(row: any, table: StRequest['table']): StRequest {
  const fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (HIDDEN_KEYS.has(k) || v === null || v === '' || typeof v === 'object') continue;
    fields[k.replace(/_/g, ' ')] = String(v);
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    fields,
    status: row.status ?? null,
    table,
  };
}

export async function listStRequests(): Promise<StRequest[]> {
  const db = pcstClient();
  const [appts, enqs] = await Promise.all([
    db.from('appointment_requests').select('*').order('created_at', { ascending: false }).limit(100),
    db.from('enquiries').select('*').order('created_at', { ascending: false }).limit(100),
  ]);
  return [
    ...(appts.data ?? []).map((r) => mapRequest(r, 'appointment_requests' as const)),
    ...(enqs.data ?? []).map((r) => mapRequest(r, 'enquiries' as const)),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
