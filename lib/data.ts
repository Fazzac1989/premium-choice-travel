import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { sampleDestinations, samplePackages } from '@/lib/sample-data';
import { catalogueBySlug } from '@/lib/destination-catalogue';
import type { Destination, Package } from '@/lib/types';

/**
 * Public-site data access. Reads via the service-role client (server only).
 * When Supabase isn't configured yet — e.g. a fresh Vercel deploy — every
 * reader falls back to the built-in sample catalogue so the site is never empty.
 */

export function mapDestination(row: any): Destination {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    region: row.region ?? '',
    blurb: row.blurb ?? '',
    heroImage: row.hero_image ?? '',
    featured: Boolean(row.featured),
    sortOrder: row.sort_order ?? 0,
    intro: row.intro ?? [],
    whenToTravel: row.when_to_travel ?? [],
    culture: row.culture ?? [],
    strapline: row.strapline ?? '',
    tags: row.tags ?? [],
    seasonality: row.seasonality ?? { best: [], good: [], possible: [] },
    subDestinations: row.sub_destinations ?? [],
    experiences: row.experiences ?? [],
    stay: row.stay ?? [],
    journeyIdeas: row.journey_ideas ?? [],
    gallery: row.gallery ?? [],
    priorityRank: row.priority_rank ?? 999,
    published: row.published ?? true,
  };
}

/**
 * Fill any empty rich fields on a DB row from the built-in catalogue, so the
 * site stays complete while the database is still being migrated/seeded.
 */
function enrichDestination(d: Destination): Destination {
  const c = catalogueBySlug.get(d.slug);
  if (!c) return d;
  return {
    ...d,
    strapline: d.strapline || c.strapline,
    blurb: d.blurb || c.blurb,
    heroImage: d.heroImage || c.heroImage,
    intro: d.intro.length ? d.intro : c.intro,
    whenToTravel: d.whenToTravel.length ? d.whenToTravel : c.whenToTravel,
    culture: d.culture.length ? d.culture : c.culture,
    tags: d.tags.length ? d.tags : c.tags,
    seasonality: d.seasonality.best.length || d.seasonality.good.length ? d.seasonality : c.seasonality,
    subDestinations: d.subDestinations.length ? d.subDestinations : c.subDestinations,
    experiences: d.experiences.length ? d.experiences : c.experiences,
    stay: d.stay.length ? d.stay : c.stay,
    journeyIdeas: d.journeyIdeas.length ? d.journeyIdeas : c.journeyIdeas,
    gallery: d.gallery.length ? d.gallery : c.gallery,
    priorityRank: d.priorityRank !== 999 ? d.priorityRank : c.priorityRank,
  };
}

export function mapPackage(row: any): Package {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline ?? '',
    destinationSlug: row.destinations?.slug ?? row.destination_slug ?? '',
    destinationName: row.destinations?.name ?? row.destination_name ?? '',
    region: row.destinations?.region ?? row.region ?? '',
    brand:
      row.brand ??
      (row.category === 'Staycations' ? 'staycations' : row.category === 'Cruises' ? 'cruises' : 'holidays'),
    category: row.category ?? '',
    nights: row.nights ?? 0,
    days: row.days ?? 0,
    priceFrom: row.price_from === null || row.price_from === undefined ? null : Number(row.price_from),
    currency: row.currency ?? 'AED',
    heroImage: row.hero_image ?? '',
    gallery: row.gallery ?? [],
    overview: row.overview ?? [],
    highlights: row.highlights ?? [],
    includes: row.includes ?? [],
    excludes: row.excludes ?? [],
    itinerary: row.itinerary ?? [],
    hotelName: row.hotel_name,
    boardBasis: row.board_basis,
    featured: Boolean(row.featured),
    status: row.status ?? 'published',
    updatedAt: row.updated_at,
  };
}

const PACKAGE_SELECT = '*, destinations(slug, name, region)';

export async function getDestinations(): Promise<Destination[]> {
  if (!isSupabaseConfigured()) return sampleDestinations;
  const db = createAdminClient();
  const { data, error } = await db.from('destinations').select('*').order('sort_order');
  if (error || !data) return sampleDestinations;

  // DB rows first (enriched), then catalogue-only destinations not yet seeded.
  const rows = data.map(mapDestination).filter((d) => d.published).map(enrichDestination);
  const dbSlugs = new Set(rows.map((d) => d.slug));
  const extras = sampleDestinations.filter((d) => !dbSlugs.has(d.slug));
  return [...rows, ...extras].sort((a, b) => a.priorityRank - b.priorityRank);
}

export async function getDestination(slug: string): Promise<Destination | null> {
  if (!isSupabaseConfigured()) return sampleDestinations.find((d) => d.slug === slug) ?? null;
  const db = createAdminClient();
  const { data } = await db.from('destinations').select('*').eq('slug', slug).maybeSingle();
  if (data) {
    const mapped = mapDestination(data);
    return mapped.published ? enrichDestination(mapped) : null;
  }
  return sampleDestinations.find((d) => d.slug === slug) ?? null;
}

export async function getPublishedPackages(): Promise<Package[]> {
  if (!isSupabaseConfigured()) return samplePackages.filter((p) => p.status === 'published');
  const db = createAdminClient();
  const { data, error } = await db
    .from('packages')
    .select(PACKAGE_SELECT)
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error || !data) return samplePackages;
  return data.map(mapPackage);
}

export async function getFeaturedPackages(): Promise<Package[]> {
  const all = await getPublishedPackages();
  const featured = all.filter((p) => p.featured);
  return (featured.length > 0 ? featured : all).slice(0, 6);
}

export async function getPackage(slug: string): Promise<Package | null> {
  if (!isSupabaseConfigured()) return samplePackages.find((p) => p.slug === slug) ?? null;
  const db = createAdminClient();
  const { data } = await db.from('packages').select(PACKAGE_SELECT).eq('slug', slug).maybeSingle();
  return data ? mapPackage(data) : null;
}

export async function getPackagesForDestination(destinationSlug: string): Promise<Package[]> {
  const all = await getPublishedPackages();
  return all.filter((p) => p.destinationSlug === destinationSlug);
}

export async function getPackagesByBrand(brand: string, limit?: number): Promise<Package[]> {
  const all = await getPublishedPackages();
  const filtered = all.filter((p) => p.brand === brand);
  return limit ? filtered.slice(0, limit) : filtered;
}

/** The four brand rows shown on the homepage, each with its hero packages. */
export async function getHomepageBrandSections(): Promise<{ brand: string; packages: Package[] }[]> {
  const all = await getPublishedPackages();
  return ['holidays', 'golf', 'cruises', 'staycations'].map((brand) => ({
    brand,
    packages: all.filter((p) => p.brand === brand).slice(0, 4),
  }));
}
