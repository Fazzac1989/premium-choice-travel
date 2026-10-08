import type { Package, Seasonality } from '@/lib/types';

/**
 * Golf's one geography tree and one trip-type list.
 *
 * The journeys were authored over two waves and the database also still holds
 * the original sample rows, so the raw `category` and destination labels
 * disagree with each other ("Golf & beach" and "Golf and beach", Scotland next
 * to "United Kingdom" for Northern Ireland, Jamaica filed as "Caribbean", a
 * Scottish links tour badged "Adventure"). Everything the golf site shows or
 * filters on goes through here, so cards, filters, breadcrumbs and the
 * destinations page always agree — whatever the row happens to say.
 */

export const GOLF_REGIONS = [
  'UAE & Oman',
  'Europe',
  'UK & Ireland',
  'Africa & Indian Ocean',
  'Asia',
  'Americas & Caribbean',
] as const;
export type GolfRegion = (typeof GOLF_REGIONS)[number];

/** Country label and region, keyed by destination slug. */
const COUNTRIES: Record<string, { country: string; region: GolfRegion }> = {
  'united-arab-emirates': { country: 'UAE', region: 'UAE & Oman' },
  oman: { country: 'Oman', region: 'UAE & Oman' },
  portugal: { country: 'Portugal', region: 'Europe' },
  spain: { country: 'Spain', region: 'Europe' },
  turkey: { country: 'Türkiye', region: 'Europe' },
  cyprus: { country: 'Cyprus', region: 'Europe' },
  greece: { country: 'Greece', region: 'Europe' },
  italy: { country: 'Italy', region: 'Europe' },
  france: { country: 'France', region: 'Europe' },
  scotland: { country: 'Scotland', region: 'UK & Ireland' },
  'northern-ireland': { country: 'Northern Ireland', region: 'UK & Ireland' },
  england: { country: 'England', region: 'UK & Ireland' },
  'united-kingdom': { country: 'England', region: 'UK & Ireland' },
  ireland: { country: 'Ireland', region: 'UK & Ireland' },
  mauritius: { country: 'Mauritius', region: 'Africa & Indian Ocean' },
  'south-africa': { country: 'South Africa', region: 'Africa & Indian Ocean' },
  morocco: { country: 'Morocco', region: 'Africa & Indian Ocean' },
  thailand: { country: 'Thailand', region: 'Asia' },
  vietnam: { country: 'Vietnam', region: 'Asia' },
  malaysia: { country: 'Malaysia', region: 'Asia' },
  indonesia: { country: 'Indonesia', region: 'Asia' },
  cambodia: { country: 'Cambodia', region: 'Asia' },
  'united-states': { country: 'USA', region: 'Americas & Caribbean' },
  mexico: { country: 'Mexico', region: 'Americas & Caribbean' },
  'dominican-republic': { country: 'Dominican Republic', region: 'Americas & Caribbean' },
  jamaica: { country: 'Jamaica', region: 'Americas & Caribbean' },
};

/**
 * Journeys whose destination row is too coarse to name the country. The
 * catalogue has no Northern Ireland or Jamaica destination, so those trips sit
 * under "United Kingdom" and "Caribbean"; the trip itself knows better.
 */
const COUNTRY_BY_SLUG: Record<string, string> = {
  'northern-ireland-links': 'northern-ireland',
  'belfry-ryder-cup-resort-break': 'england',
  'jamaica-montego-bay-golf': 'jamaica',
};

/** The display name of a golf country key, e.g. "northern-ireland" → "Northern Ireland". */
export function countryLabel(slug: string): string | null {
  return COUNTRIES[slug]?.country ?? null;
}

export function golfPlace(pkg: Pick<Package, 'slug' | 'destinationSlug' | 'destinationName'> & { details?: Package['details'] }) {
  // A row can also name its country itself (details.countrySlug), as the
  // imported sourcing briefs do, so new trips need no entry in the map above.
  const own = typeof pkg.details?.countrySlug === 'string' ? pkg.details.countrySlug : null;
  const key = (own && COUNTRIES[own] ? own : null) ?? COUNTRY_BY_SLUG[pkg.slug] ?? pkg.destinationSlug;
  const known = COUNTRIES[key];
  if (known) return { countrySlug: key, ...known };
  return { countrySlug: pkg.destinationSlug, country: pkg.destinationName, region: 'Europe' as GolfRegion };
}

export const GOLF_TRIP_TYPES = [
  { key: 'beach', label: 'Golf & beach' },
  { key: 'all-inclusive', label: 'All-inclusive golf' },
  { key: 'championship', label: 'Championship courses' },
  { key: 'links', label: 'Links golf' },
  { key: 'resort', label: 'Resort golf' },
  { key: 'city', label: 'Golf & city' },
  { key: 'culture', label: 'Golf & culture' },
  { key: 'touring', label: 'Touring & two-centre' },
] as const;
export type GolfTripTypeKey = (typeof GOLF_TRIP_TYPES)[number]['key'];

/** Every category spelling seen in the data, folded to one trip type. */
const TYPE_BY_CATEGORY: Record<string, GolfTripTypeKey> = {
  'golf & beach': 'beach',
  'golf and beach': 'beach',
  'beach & islands': 'beach',
  'all-inclusive golf': 'all-inclusive',
  'championship golf': 'championship',
  'links golf': 'links',
  'resort golf': 'resort',
  'golf & leisure': 'resort',
  'golf and scenery': 'resort',
  'golf and city': 'city',
  'golf & city': 'city',
  'golf & culture': 'culture',
  'golf and culture': 'culture',
  'two-centre golf': 'touring',
  'golf & touring': 'touring',
  'touring golf': 'touring',
};

/**
 * Old sample rows carried brochure categories ("Adventure", "Honeymoon") that
 * mean nothing on a golf site. Those four trips are named here so the badge is
 * right even before the database is re-seeded.
 */
const TYPE_BY_SLUG: Record<string, GolfTripTypeKey> = {
  'scotland-links-classic': 'links',
  'algarve-golf-escape': 'championship',
  'belek-golf-week': 'all-inclusive',
  'mauritius-golf-and-beach': 'beach',
  'thailands-ultimate-two-city-golf-escape': 'touring',
};

export function golfTripType(pkg: Pick<Package, 'slug' | 'category' | 'tags'>): GolfTripTypeKey {
  const bySlug = TYPE_BY_SLUG[pkg.slug];
  if (bySlug) return bySlug;
  const raw = (pkg.category ?? '').trim().toLowerCase();
  const byCategory = TYPE_BY_CATEGORY[raw] ?? GOLF_TRIP_TYPES.find((t) => t.label.toLowerCase() === raw)?.key;
  if (byCategory) return byCategory;
  const tags = pkg.tags ?? [];
  if (tags.includes('all-inclusive')) return 'all-inclusive';
  if (tags.includes('multi-centre')) return 'touring';
  if (tags.includes('beach')) return 'beach';
  if (tags.includes('city')) return 'city';
  return 'resort';
}

export function tripTypeLabel(key: GolfTripTypeKey) {
  return GOLF_TRIP_TYPES.find((t) => t.key === key)!.label;
}

export type GolfBoard = 'room-only' | 'self-catering' | 'breakfast' | 'half-board' | 'all-inclusive';
export const GOLF_BOARDS: { key: GolfBoard; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'half-board', label: 'Half board' },
  { key: 'all-inclusive', label: 'All-inclusive' },
  { key: 'self-catering', label: 'Self-catering' },
  { key: 'room-only', label: 'Room only' },
];

/**
 * The board options a trip can be had on. "Breakfast or half board" offers
 * both, so it answers either filter; the label on the card stays the authored
 * wording, which is more precise than any category.
 */
export function golfBoards(boardBasis: string | null): GolfBoard[] {
  const b = (boardBasis ?? '').toLowerCase();
  const out: GolfBoard[] = [];
  if (/all[- ]inclusive/.test(b)) out.push('all-inclusive');
  if (/half board|dinner, bed/.test(b)) out.push('half-board');
  if (/breakfast/.test(b) && !/dinner, bed/.test(b)) out.push('breakfast');
  if (/self[- ]catering/.test(b)) out.push('self-catering');
  if (/room only/.test(b)) out.push('room-only');
  return out;
}

export type GolfLength = 'short' | 'mid' | 'week' | 'long';
export const GOLF_LENGTHS: { key: GolfLength; label: string; test: (n: number) => boolean }[] = [
  { key: 'short', label: 'Short break (2–4 nights)', test: (n) => n <= 4 },
  { key: 'mid', label: '5–6 nights', test: (n) => n >= 5 && n <= 6 },
  { key: 'week', label: 'A week (7 nights)', test: (n) => n === 7 },
  { key: 'long', label: '8 nights or more', test: (n) => n >= 8 },
];

export const GOLF_ROUNDS = [
  { key: '2', label: '2 rounds', test: (r: number | null) => r === 2 },
  { key: '3', label: '3 rounds', test: (r: number | null) => r === 3 },
  { key: '4', label: '4 rounds', test: (r: number | null) => r === 4 },
  { key: '5', label: '5 or more', test: (r: number | null) => r !== null && r >= 5 },
];

/**
 * What the trip does about flights, in the words a UAE golfer needs. Prices
 * are land prices; flights are quoted for the dates and departure airport
 * actually asked for, never folded into a from-price.
 */
export function flightBasis(pkg: Pick<Package, 'includes' | 'destinationSlug' | 'slug'>): string {
  const flight = (pkg.includes ?? []).find((i) => /flight/i.test(i));
  if (pkg.destinationSlug === 'united-arab-emirates') return 'Not needed';
  if (flight && /self-drive|drive/i.test(flight)) return 'Drive, or quoted';
  if (flight) return 'Quoted separately';
  return 'Land only';
}

export type GolfFacts = {
  rounds: number | null;
  roundsLabel: string | null;
  board: string | null;
  boards: GolfBoard[];
  stay: string | null;
  flights: string;
  tripType: GolfTripTypeKey;
  tripTypeLabel: string;
  country: string;
  countrySlug: string;
  region: GolfRegion;
};

export function golfFacts(pkg: Package): GolfFacts {
  const d = pkg.details ?? {};
  const rounds = typeof d.rounds === 'number' ? d.rounds : null;
  const type = golfTripType(pkg);
  const place = golfPlace(pkg);
  return {
    rounds,
    roundsLabel: rounds ? `${rounds} round${rounds === 1 ? '' : 's'}` : typeof d.roundsNote === 'string' ? d.roundsNote : null,
    board: pkg.boardBasis,
    boards: golfBoards(pkg.boardBasis),
    stay: pkg.hotelName,
    flights: flightBasis(pkg),
    tripType: type,
    tripTypeLabel: tripTypeLabel(type),
    ...place,
  };
}

/** A price is shown only once someone has approved it in the admin. */
export function approvedPrice(pkg: Pick<Package, 'priceFrom' | 'priceStatus'>): number | null {
  return pkg.priceFrom !== null && pkg.priceStatus === 'approved' ? pkg.priceFrom : null;
}

export type GolfCriteria = {
  q: string;
  region: string;
  country: string;
  type: string;
  length: string;
  rounds: string;
  board: string;
  month: string;
  budget: string;
  group: boolean;
  /** Result order; not a filter, so never counted as one. */
  sort: string;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v ?? '').trim();

export function parseGolfCriteria(sp: Record<string, string | string[] | undefined>): GolfCriteria {
  return {
    q: one(sp.q).slice(0, 80),
    region: one(sp.region),
    country: one(sp.country),
    type: one(sp.type),
    length: one(sp.length),
    rounds: one(sp.rounds),
    board: one(sp.board),
    month: one(sp.month),
    budget: one(sp.budget),
    group: one(sp.group) === '1',
    sort: one(sp.sort),
  };
}

export function activeFilterCount(c: GolfCriteria) {
  return [c.q, c.region, c.country, c.type, c.length, c.rounds, c.board, c.month, c.budget].filter(Boolean).length + (c.group ? 1 : 0);
}

/** Group-friendly: authored for groups, societies or friends, or a fourball-sized idea. */
export function suitsGroups(pkg: Package) {
  const text = [...(pkg.whoFor ?? []), pkg.tagline, ...(pkg.overview ?? [])].join(' ').toLowerCase();
  return /\bgroups?\b|societ|fourball|friends/.test(text);
}

function searchText(pkg: Package, f: GolfFacts) {
  const courses = Array.isArray(pkg.details?.courses)
    ? pkg.details.courses.map((c: { heading?: string }) => c.heading ?? '').join(' ')
    : '';
  return [pkg.title, pkg.tagline, pkg.destinationName, f.country, f.region, pkg.hotelName, courses, f.tripTypeLabel]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export const GOLF_SORTS = [
  { key: '', label: 'Recommended' },
  { key: 'nights', label: 'Shortest first' },
  { key: 'nights-desc', label: 'Longest first' },
  { key: 'rounds', label: 'Most golf' },
  { key: 'price', label: 'Price, low to high' },
];

/**
 * Result order. Recommended keeps featured trips first, as the admin set
 * them. Price order puts trips without an approved price last rather than
 * pretending they are cheapest.
 */
export function sortGolf(packages: Package[], sort: string): Package[] {
  const list = [...packages];
  const rounds = (p: Package) => (typeof p.details?.rounds === 'number' ? p.details.rounds : 0);
  switch (sort) {
    case 'nights':
      return list.sort((a, b) => a.nights - b.nights);
    case 'nights-desc':
      return list.sort((a, b) => b.nights - a.nights);
    case 'rounds':
      return list.sort((a, b) => rounds(b) - rounds(a));
    case 'price':
      return list.sort((a, b) => (approvedPrice(a) ?? Infinity) - (approvedPrice(b) ?? Infinity));
    default:
      return list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
}

export function filterGolf(
  packages: Package[],
  c: GolfCriteria,
  seasonalityBySlug: Record<string, Seasonality | undefined> = {},
): Package[] {
  const words = c.q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const month = Number(c.month);
  const budget = Number(c.budget);
  const length = GOLF_LENGTHS.find((l) => l.key === c.length);
  const rounds = GOLF_ROUNDS.find((r) => r.key === c.rounds);

  return packages.filter((pkg) => {
    const f = golfFacts(pkg);
    if (c.region && f.region !== c.region) return false;
    if (c.country && f.countrySlug !== c.country) return false;
    if (c.type && f.tripType !== c.type) return false;
    if (length && !length.test(pkg.nights)) return false;
    if (rounds && !rounds.test(f.rounds)) return false;
    if (c.board && !f.boards.includes(c.board as GolfBoard)) return false;
    if (month >= 1 && month <= 12) {
      const s = seasonalityBySlug[pkg.destinationSlug];
      // No seasonality on file means we cannot rule the month out.
      if (s && !s.best.includes(month) && !s.good.includes(month)) return false;
    }
    if (budget > 0) {
      const price = approvedPrice(pkg);
      if (price === null || price > budget) return false;
    }
    if (c.group && !suitsGroups(pkg)) return false;
    if (words.length) {
      const text = searchText(pkg, f);
      if (!words.every((w) => text.includes(w))) return false;
    }
    return true;
  });
}

/** Countries that actually have golf journeys, grouped by region, in tree order. */
export function golfGeography(packages: Package[]) {
  const byRegion = new Map<GolfRegion, Map<string, { slug: string; country: string; count: number }>>();
  for (const pkg of packages) {
    const f = golfFacts(pkg);
    const countries = byRegion.get(f.region) ?? new Map();
    const row = countries.get(f.countrySlug) ?? { slug: f.countrySlug, country: f.country, count: 0 };
    row.count += 1;
    countries.set(f.countrySlug, row);
    byRegion.set(f.region, countries);
  }
  return GOLF_REGIONS.filter((r) => byRegion.has(r)).map((region) => ({
    region,
    countries: Array.from(byRegion.get(region)!.values()).sort((a, b) => a.country.localeCompare(b.country)),
  }));
}

/**
 * Course text was authored with "Access unverified — confirmed at booking"
 * (and variants) after every course. Said once per course it buries the
 * course; the golf section now states the status once, from the record.
 */
export function stripAccessNote(text: string) {
  return text
    .replace(/\s*(?:All (?:course )?access|Course access|Access)\s+unverified(?:\s+until confirmed(?:\s+per course)?)?(?:\s*[—–-]\s*[^.]*)?\.?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Tee-time status values match the admin dropdown: held, requested, unknown. */
export const TEE_TIME_STATUS: Record<string, { label: string; detail: string; tone: 'held' | 'pending' }> = {
  held: {
    label: 'Tee times held',
    detail: 'Tee times are held with each club for this trip.',
    tone: 'held',
  },
  requested: {
    label: 'Tee times requested',
    detail: 'We have asked each club for tee times. Nothing is confirmed until the club confirms it, and we confirm it with you before you pay.',
    tone: 'pending',
  },
  unknown: {
    label: 'Not yet confirmed',
    detail: 'We ask each club for tee times when you send your dates. Nothing is confirmed until the club confirms it, and we confirm it with you before you pay.',
    tone: 'pending',
  },
};
