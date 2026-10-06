import type { RateDetails } from '@/lib/platform/client';
/**
 * The Staycations search, laid out like the trade portal's (founder, 2026-10-03): one pill —
 * where, check-in, how long for, guests — over every UAE hotel on the trade platform, not only
 * the curated list. Pure: shared by the pages, the search pill and the server actions.
 */

/** The UAE's destinations as the platform's catalogue names them (its import destinations). */
export const UAE_DESTINATIONS: readonly { cityCode: string; label: string }[] = [
  { cityCode: 'DXB', label: 'Dubai' },
  { cityCode: 'AUH', label: 'Abu Dhabi' },
  { cityCode: 'RKT', label: 'Ras Al Khaimah' },
  { cityCode: 'FJR', label: 'Fujairah' },
  { cityCode: 'SHJ', label: 'Sharjah' },
  { cityCode: 'AE1', label: 'Ajman' },
  { cityCode: 'UMM', label: 'Umm Al Quwain' },
  { cityCode: 'AAN', label: 'Al Ain' },
];

/**
 * Where the platform's catalogue holds the bed banks' hotels, so a search finds them. Dubai only
 * for now (founder, 2026-10-03: the bed banks' content-import allowance is used up); add an
 * emirate's code here once its import is done on the trade console. Anywhere else shows our
 * curated stays with guide prices and the "ask us" route.
 */
export const LIVE_CITY_CODES: ReadonlySet<string> = new Set(['DXB']);
export const isLiveDestination = (cityCode: string | null | undefined) =>
  Boolean(cityCode && LIVE_CITY_CODES.has(cityCode));

/** The curated list's emirate names, mapped to the platform's destination. */
export function cityCodeForEmirate(emirate: string | null | undefined): string | null {
  if (!emirate) return null;
  const e = emirate.toLowerCase().replace(/[^a-z]/g, '');
  const hit = UAE_DESTINATIONS.find((d) => d.label.toLowerCase().replace(/[^a-z]/g, '') === e);
  return hit?.cityCode ?? null;
}

export const MAX_NIGHTS = 30;
export const MAX_ADULTS = 6;
export const MAX_CHILDREN = 4;

export type StaySearch = {
  /** what the pill shows */
  where: string;
  cityCode: string | null;
  checkIn: string | null;
  nights: number;
  adults: number;
  /** -1 = an age not chosen yet */
  childAges: number[];
  sort: 'best' | 'price' | 'stars';
  /** free cancellation only */
  refundable: boolean;
  board: string | null;
  minStars: number | null;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, k: string) => {
  const v = p[k];
  return Array.isArray(v) ? v[0] : v;
};

/** Read a search from the URL; the older `emirate` and `to` parameters still work. */
export function parseStaySearch(p: Params): StaySearch {
  const cityParam = (one(p, 'city') ?? '').toUpperCase();
  const known = UAE_DESTINATIONS.find((d) => d.cityCode === cityParam);
  const fromEmirate = cityCodeForEmirate(one(p, 'emirate'));
  const cityCode = known?.cityCode ?? fromEmirate;
  const where =
    one(p, 'where')?.slice(0, 80) ||
    UAE_DESTINATIONS.find((d) => d.cityCode === cityCode)?.label ||
    '';

  const from = one(p, 'from') ?? one(p, 'checkIn') ?? '';
  const checkIn = ISO.test(from) ? from : null;
  let nights = Number(one(p, 'nights')) || 0;
  const to = one(p, 'to') ?? '';
  if (!nights && checkIn && ISO.test(to)) nights = Math.round((Date.parse(to) - Date.parse(checkIn)) / 86_400_000);
  nights = clamp(nights || 2, 1, MAX_NIGHTS);

  const adults = clamp(Number(one(p, 'adults')) || 2, 1, MAX_ADULTS);
  const children = clamp(Number(one(p, 'children')) || 0, 0, MAX_CHILDREN);
  const given = (one(p, 'ages') ?? '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((n) => clamp(Number(n), 0, 17));
  const childAges = Array.from({ length: children }, (_, i) => given[i] ?? -1);

  const sortParam = one(p, 'sort');
  const sort = sortParam === 'price' || sortParam === 'stars' ? sortParam : 'best';
  const stars = Number(one(p, 'stars'));
  return {
    where,
    cityCode,
    checkIn,
    nights,
    adults,
    childAges,
    sort,
    refundable: one(p, 'free') === '1',
    board: one(p, 'board')?.slice(0, 8) || null,
    minStars: stars >= 1 && stars <= 5 ? stars : null,
  };
}

/** The URL for a search (and its sort and filters). */
export function staySearchQuery(s: Partial<StaySearch>): string {
  const q = new URLSearchParams();
  if (s.where) q.set('where', s.where);
  if (s.cityCode) q.set('city', s.cityCode);
  if (s.checkIn) q.set('from', s.checkIn);
  if (s.nights) q.set('nights', String(s.nights));
  if (s.adults) q.set('adults', String(s.adults));
  if (s.childAges?.length) {
    q.set('children', String(s.childAges.length));
    q.set('ages', s.childAges.map((a) => (a < 0 ? '' : a)).join(','));
  }
  if (s.sort && s.sort !== 'best') q.set('sort', s.sort);
  if (s.refundable) q.set('free', '1');
  if (s.board) q.set('board', s.board);
  if (s.minStars) q.set('stars', String(s.minStars));
  const out = q.toString();
  return out ? `?${out}` : '';
}

export const agesMissing = (s: Pick<StaySearch, 'childAges'>) => s.childAges.some((a) => a < 0);

export function checkOutOf(checkIn: string, nights: number): string {
  const d = new Date(`${checkIn}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + nights);
  return d.toISOString().slice(0, 10);
}

export function partyLabel(s: Pick<StaySearch, 'adults' | 'childAges'>): string {
  const a = `${s.adults} adult${s.adults === 1 ? '' : 's'}`;
  const c = s.childAges.length;
  return c ? `${a}, ${c} child${c === 1 ? '' : 'ren'}` : a;
}

const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
export function datesLabel(checkIn: string, nights: number): string {
  return `${day.format(new Date(`${checkIn}T00:00:00Z`))} – ${day.format(new Date(`${checkOutOf(checkIn, nights)}T00:00:00Z`))} · ${nights} night${nights === 1 ? '' : 's'}`;
}

/* ----------------------------------------------------------- hotel addresses */

const UUID_TAIL = /-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function nameSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** A hotel only the platform knows is addressed by its name and its platform id. */
export function platformSlug(name: string, platformHotelId: string): string {
  return `${nameSlug(name) || 'hotel'}-${platformHotelId.toLowerCase()}`;
}

/** The platform id a slug carries, if it is a platform hotel's. */
export function platformIdFromSlug(slug: string): string | null {
  return UUID_TAIL.exec(slug)?.[1]?.toLowerCase() ?? null;
}

/* ------------------------------------------------------------- what a page shows */

/** A supplier's room name as a heading: "double or twin standard" and "ROVER SEA VIEW" read as "Double or twin standard" and "Rover sea view". */
export function roomTitle(name: string): string {
  const t = name.trim();
  if (!t) return t;
  const shouting = t === t.toUpperCase() && /[A-Z]{3}/.test(t);
  const base = shouting ? t.toLowerCase() : t;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * What a rate comes with, for a customer (2026-10-06): the deal's name, what is included, the
 * hotel's important information and what is paid at the hotel, in major units. Never what a deal
 * took off the price.
 */
export type RateInfo = {
  deal: string | null;
  inclusions: string[];
  notes: string[];
  payAtHotel: { label: string; amount: number; currency: string }[];
};

const EXPONENT: Record<string, number> = { KWD: 3, BHD: 3, OMR: 3, JOD: 3 };

export function toRateInfo(d: RateDetails | null | undefined): RateInfo | null {
  if (!d) return null;
  const info: RateInfo = {
    deal: d.offers[0] ?? null,
    inclusions: d.inclusions,
    notes: d.notes,
    payAtHotel: d.payAtHotel.map((c) => ({
      label: c.label,
      amount: c.amount / 10 ** (EXPONENT[c.currency] ?? 2),
      currency: c.currency,
    })),
  };
  return info.deal || info.inclusions.length || info.notes.length || info.payAtHotel.length ? info : null;
}

/** A room as a customer sees it: never the supplier, the source or how the price was built. */
export type PublicRate = {
  offerId: string;
  roomName: string;
  board: string;
  boardCode: string;
  refundable: boolean;
  refundDeadline: string | null;
  /** in major units (dirhams) */
  total: number;
  perNight: number;
  currency: string;
  /** the deal, inclusions, important information and pay-at-hotel charges; null when none */
  info: RateInfo | null;
};

export type StayResult = {
  platformHotelId: string;
  name: string;
  city: string;
  stars: number | null;
  image: string | null;
  /** our specialists chose it: it has our own write-up */
  curated: boolean;
  slug: string;
  best: PublicRate;
  roomCount: number;
};

export type StayResultsPage = {
  sessionId: string;
  pending: boolean;
  total: number;
  nextOffset: number | null;
  results: StayResult[];
  /** set when the search could not be run or read */
  problem: string | null;
};

export function moneyLabel(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

const cancelDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', year: 'numeric' });
export function cancellationLabel(r: Pick<PublicRate, 'refundable' | 'refundDeadline'>): string {
  if (!r.refundable) return 'Non-refundable';
  if (!r.refundDeadline) return 'Free cancellation';
  return `Free cancellation until ${cancelDate.format(new Date(r.refundDeadline))}`;
}
