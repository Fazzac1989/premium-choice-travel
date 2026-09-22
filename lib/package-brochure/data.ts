import { createAdminClient } from '@/lib/supabase/admin';
import {
  mapBrochure,
  mapPage,
  type CourseNote,
  type ItineraryDay,
  type PackageBrochure,
  type PackageBrochurePage,
} from '@/lib/package-brochure/schema';

/**
 * What the brochure needs to know about one package.
 *
 * The package record is the authority on every fact here. The brochure may
 * compose its own words over the top — that lives in the page's content — but
 * nothing is invented: a field the package does not fill stays null, and the
 * page simply does not show it.
 */
export type BrochurePackage = {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  category: string | null;
  /** "Scotland", and the region it sits in — the contents groups by region. */
  destination: string | null;
  destinationSlug: string | null;
  region: string | null;
  nights: number;
  days: number;
  /** Null on most packages: only a handful carry a published price. */
  priceFrom: number | null;
  currency: string;
  /** "on_request" and the like — printed beside the price, or instead of it. */
  priceStatus: string | null;
  heroImage: string | null;
  images: string[];
  overview: string[];
  highlights: string[];
  includes: string[];
  excludes: string[];
  itinerary: ItineraryDay[];
  hotelName: string | null;
  boardBasis: string | null;
  whoFor: string[];
  whyWorks: string[];
  seasonalNotes: string | null;
  extensions: string[];
  /** The golf facts: rounds, courses, handicap, buggies, caddies, tee times. */
  rounds: number | null;
  roundsNote: string | null;
  courses: CourseNote[];
  handicap: string | null;
  buggies: string | null;
  caddies: string | null;
  nonGolfer: string | null;
  clubCarriage: string | null;
  /** Whether tee times are held, requested or unknown. Printed as written. */
  teeTimeStatus: string | null;
};

export type BrochureAccess =
  | { state: 'ok'; data: { brochure: PackageBrochure; pages: PackageBrochurePage[]; packages: Record<number, BrochurePackage> } }
  | { state: 'missing' };

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];

const text = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : null;
};

/** The gallery is a list of URLs, or of objects carrying one. */
const gallery = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .map((g) => (typeof g === 'string' ? g : (g as any)?.url))
        .filter((u): u is string => typeof u === 'string' && u.trim() !== '')
    : [];

function mapPackage(row: any): BrochurePackage {
  const details = (row.details && typeof row.details === 'object' ? row.details : {}) as Record<string, unknown>;
  const courses = Array.isArray(details.courses)
    ? (details.courses as any[])
        .map((c) => ({ heading: text(c?.heading) ?? '', body: text(c?.body) ?? '' }))
        .filter((c) => c.heading || c.body)
    : [];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: text(row.tagline),
    category: text(row.category),
    destination: text(row.destinations?.name),
    destinationSlug: text(row.destinations?.slug),
    region: text(row.destinations?.region),
    nights: row.nights ?? 0,
    days: row.days ?? 0,
    priceFrom: typeof row.price_from === 'number' ? row.price_from : null,
    currency: text(row.currency) ?? 'AED',
    priceStatus: text(row.price_status),
    heroImage: text(row.hero_image),
    images: gallery(row.gallery),
    overview: strings(row.overview),
    highlights: strings(row.highlights),
    includes: strings(row.includes),
    excludes: strings(row.excludes),
    itinerary: Array.isArray(row.itinerary)
      ? (row.itinerary as any[])
          .map((d) => ({
            label: text(d?.label) ?? '',
            title: text(d?.title) ?? '',
            description: text(d?.description) ?? '',
          }))
          .filter((d) => d.title || d.description)
      : [],
    hotelName: text(row.hotel_name),
    boardBasis: text(row.board_basis),
    whoFor: strings(row.who_for),
    whyWorks: strings(row.why_works),
    seasonalNotes: text(row.seasonal_notes),
    extensions: strings(row.extensions),
    rounds: typeof details.rounds === 'number' ? (details.rounds as number) : null,
    roundsNote: text(details.roundsNote),
    courses,
    handicap: text(details.handicap),
    buggies: text(details.buggies),
    caddies: text(details.caddies),
    nonGolfer: text(details.nonGolfer),
    clubCarriage: text(details.clubCarriage),
    teeTimeStatus: text(details.teeTimeStatus),
  };
}

/**
 * Load a brochure and everything it renders from.
 *
 * Draft and archived brochures are not readable here; the studio reads them
 * through its own admin query. A brochure whose packages have since been
 * unpublished still renders them, because a printed brochure that silently
 * drops a page is worse than one that is a little out of date — the studio
 * shows the warning instead.
 */
export async function loadPackageBrochure(slug: string): Promise<BrochureAccess> {
  const db = createAdminClient();

  const { data: row } = await db
    .from('package_brochures')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!row || row.status !== 'published') return { state: 'missing' };

  const brochure = mapBrochure(row);

  const { data: pageRows } = await db
    .from('package_brochure_pages')
    .select('*')
    .eq('brochure_id', brochure.id)
    .order('sort_order');

  const pages = (pageRows ?? []).map(mapPage);

  const ids = Array.from(
    new Set(pages.map((p) => p.packageId).filter((x): x is number => typeof x === 'number')),
  );
  const packages: Record<number, BrochurePackage> = {};

  if (ids.length) {
    const { data: packageRows } = await db
      .from('packages')
      .select('*, destinations(name, slug, region)')
      .in('id', ids);
    for (const p of packageRows ?? []) packages[p.id] = mapPackage(p);
  }

  return { state: 'ok', data: { brochure, pages, packages } };
}

/** Every published brochure for a brand — used by the brand site's listing. */
export async function listBrochures(brand: string): Promise<PackageBrochure[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('package_brochures')
    .select('*')
    .eq('brand', brand)
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  return (data ?? []).map(mapBrochure);
}
