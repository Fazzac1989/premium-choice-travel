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
    tags: row.tags ?? [],
    whoFor: row.who_for ?? [],
    whyWorks: row.why_works ?? [],
    seasonalNotes: row.seasonal_notes ?? '',
    extensions: row.extensions ?? [],
    details: row.details ?? {},
    seoTitle: row.seo_title ?? '',
    seoDescription: row.seo_description ?? '',
    priceStatus: row.price_status ?? 'on_request',
    reviewNote: row.review_note ?? '',
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

/**
 * Intelligent related journeys: scored by shared AI tags, destination, brand
 * and journey type, so a Maldives family journey suggests Mauritius/Seychelles
 * family journeys rather than whatever shares a destination row.
 */
export async function getRelatedJourneys(pkg: Package, limit = 3): Promise<Package[]> {
  const all = await getPublishedPackages();
  const tags = new Set((pkg.tags ?? []).map((t) => t.toLowerCase()));
  return all
    .filter((p) => p.slug !== pkg.slug)
    .map((p) => {
      let score = 0;
      for (const t of p.tags ?? []) if (tags.has(t.toLowerCase())) score += 2;
      if (p.destinationSlug && p.destinationSlug === pkg.destinationSlug) score += 3;
      if (p.brand === pkg.brand) score += 1;
      if (p.category && p.category === pkg.category) score += 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

export function mapHotel(row: any) {
  return {
    id: row.id,
    destinationId: row.destination_id,
    name: row.name,
    area: row.area ?? '',
    style: row.style ?? '',
    description: row.description ?? '',
    image: row.image ?? '',
    sortOrder: row.sort_order ?? 0,
    intro: row.intro ?? [],
    features: row.features ?? [],
    roomTypes: row.room_types ?? [],
    restaurants: row.restaurants ?? [],
    mealPlans: row.meal_plans ?? [],
    gettingThere: row.getting_there ?? '',
    transferDuration: row.transfer_duration ?? '',
    gallery: row.gallery ?? [],
    stars: row.stars ?? null,
    emirate: row.emirate ?? '',
    bestFor: row.best_for ?? [],
    featured: row.featured ?? false,
    status: row.status ?? 'published',
    priceBand: row.price_band ?? null,
    priceGuide: row.price_guide ?? '',
    placeId: row.place_id ?? '',
    photos: row.photos ?? [],
  };
}

export function mapExperience(row: any) {
  return {
    id: row.id,
    destinationId: row.destination_id,
    title: row.title,
    body: row.body ?? '',
    image: row.image ?? '',
    sortOrder: row.sort_order ?? 0,
  };
}

export const hotelSlug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-');

export async function getHotels() {
  if (!isSupabaseConfigured()) return [];
  const db = createAdminClient();
  const { data } = await db.from('hotels').select('*').order('sort_order');
  return (data ?? []).map(mapHotel);
}

/** Published UAE hotels for the Staycations directory (draft hotels hidden). */
export async function getStaycationHotels() {
  const hotels = await getHotels();
  return hotels
    .filter((h) => h.status !== 'draft' && h.emirate)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.stars ?? 0) - (a.stars ?? 0) || a.name.localeCompare(b.name));
}

/** Resolve a hotel by its name-derived slug, plus the journeys that feature it. */
export async function getHotelBySlug(slug: string) {
  const hotels = await getHotels();
  const hotel = hotels.find((h) => hotelSlug(h.name) === slug) ?? null;
  if (!hotel) return null;
  const all = await getPublishedPackages();
  const journeys = all.filter((p) => p.itinerary.some((d) => (d.hotelIds ?? []).includes(hotel.id)));
  return { hotel, journeys };
}

/** Hotels + experiences referenced by a journey's itinerary stages. */
export async function getJourneyStays(pkg: Package) {
  if (!isSupabaseConfigured()) return { hotels: [], experiences: [] };
  const hotelIds = Array.from(new Set(pkg.itinerary.flatMap((d) => d.hotelIds ?? [])));
  const experienceIds = Array.from(new Set(pkg.itinerary.flatMap((d) => d.experienceIds ?? [])));
  if (hotelIds.length === 0 && experienceIds.length === 0) return { hotels: [], experiences: [] };
  const db = createAdminClient();
  const hotelRows = hotelIds.length
    ? (await db.from('hotels').select('*').in('id', hotelIds)).data ?? []
    : [];
  const experienceRows = experienceIds.length
    ? (await db.from('experiences').select('*').in('id', experienceIds)).data ?? []
    : [];
  return {
    hotels: hotelRows.map(mapHotel),
    experiences: experienceRows.map(mapExperience),
  };
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
