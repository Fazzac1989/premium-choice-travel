/**
 * What the customer is searching for, and how it travels in a URL.
 *
 * One shape carries the whole journey — Explore → results → stay detail →
 * request — so dates and party are typed once and never guessed again.
 * Pure and dependency-free: both the server pages and the client controls
 * read it.
 *
 * Dates are plain YYYY-MM-DD strings interpreted in Asia/Dubai, because a
 * UAE resident choosing "this Friday" means Friday in Dubai, not wherever
 * the server happens to run.
 */

export const MAX_NIGHTS = 21;
export const MAX_ADULTS = 8;
export const MAX_CHILDREN = 6;
export const MAX_ROOMS = 3;
export const MAX_CHILD_AGE = 17;

export type SortKey = 'price' | 'stars' | 'name';

export type SearchCriteria = {
  /** '' means across the UAE. */
  emirate: string;
  checkIn: string;
  nights: number;
  adults: number;
  /** One age per child, at check-in. Length is the child count. */
  childrenAges: number[];
  rooms: number;
  /** Category shortcut, e.g. 'beach' — matches hotels.best_for. */
  tag: string;
  /** Price band 1–4, as a string, '' for any. */
  budget: string;
  meal: string;
  stars: string;
  sort: SortKey;
};

export function todayInDubai(): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(`${ymd}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The coming Friday in Dubai — how a staycation weekend usually starts. */
export function defaultCheckIn(): string {
  const today = todayInDubai();
  const daysToFriday = (5 - today.getUTCDay() + 7) % 7;
  return addDays(ymd(today), daysToFriday || 7);
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  // An absent value is not a zero: a missing `adults` means two, not one.
  if (value === undefined || value === null || value === '') return fallback;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** "4,9" or "4 and 9" → [4, 9], clamped and trimmed to the child count. */
export function parseAges(raw: unknown, count?: number): number[] {
  const list = String(raw ?? '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((n) => clampInt(n, 0, MAX_CHILD_AGE, 0));
  return count === undefined ? list.slice(0, MAX_CHILDREN) : list.slice(0, count);
}

export const EMPTY_CRITERIA: SearchCriteria = {
  emirate: '',
  checkIn: '',
  nights: 2,
  adults: 2,
  childrenAges: [],
  rooms: 1,
  tag: '',
  budget: '',
  meal: '',
  stars: '',
  sort: 'price',
};

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, key: string) => (Array.isArray(p[key]) ? (p[key] as string[])[0] : (p[key] as string | undefined)) ?? '';

/**
 * Read criteria from a URL. Anything missing or impossible falls back to a
 * sensible default rather than erroring — a shared link should still work.
 */
export function parseCriteria(params: Params): SearchCriteria {
  const rawCheckIn = one(params, 'from') || one(params, 'checkIn');
  const today = ymd(todayInDubai());
  const checkIn = isDate(rawCheckIn) && rawCheckIn >= today ? rawCheckIn : '';

  // A check-out date is accepted as an alternative to a night count.
  const rawOut = one(params, 'to');
  const nightsFromRange =
    checkIn && isDate(rawOut) && rawOut > checkIn
      ? Math.round((Date.parse(`${rawOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000)
      : 0;

  const children = clampInt(one(params, 'children'), 0, MAX_CHILDREN, 0);
  const ages = parseAges(one(params, 'ages'), children);

  const sortRaw = one(params, 'sort');
  return {
    emirate: one(params, 'emirate'),
    checkIn,
    nights: clampInt(nightsFromRange || one(params, 'nights'), 1, MAX_NIGHTS, 2),
    adults: clampInt(one(params, 'adults'), 1, MAX_ADULTS, 2),
    // A missing age is the one thing we cannot invent, so it stays 0 and the
    // form asks for it before a search runs.
    childrenAges: Array.from({ length: children }, (_, i) => ages[i] ?? -1),
    rooms: clampInt(one(params, 'rooms'), 1, MAX_ROOMS, 1),
    tag: one(params, 'tag'),
    budget: ['1', '2', '3', '4'].includes(one(params, 'budget')) ? one(params, 'budget') : '',
    meal: one(params, 'meal'),
    stars: ['3', '4', '5'].includes(one(params, 'stars')) ? one(params, 'stars') : '',
    sort: (['price', 'stars', 'name'] as const).includes(sortRaw as SortKey) ? (sortRaw as SortKey) : 'price',
  };
}

/** The query string for a set of criteria — defaults are left out. */
export function criteriaQuery(c: Partial<SearchCriteria>, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  if (c.emirate) q.set('emirate', c.emirate);
  if (c.checkIn) q.set('from', c.checkIn);
  if (c.nights && c.nights !== 2) q.set('nights', String(c.nights));
  if (c.adults && c.adults !== 2) q.set('adults', String(c.adults));
  const ages = (c.childrenAges ?? []).filter((a) => a >= 0);
  if (ages.length) {
    q.set('children', String(ages.length));
    q.set('ages', ages.join(','));
  }
  if (c.rooms && c.rooms !== 1) q.set('rooms', String(c.rooms));
  if (c.tag) q.set('tag', c.tag);
  if (c.budget) q.set('budget', c.budget);
  if (c.meal) q.set('meal', c.meal);
  if (c.stars) q.set('stars', c.stars);
  if (c.sort && c.sort !== 'price') q.set('sort', c.sort);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function checkOutOf(c: SearchCriteria): string {
  return c.checkIn ? addDays(c.checkIn, c.nights) : '';
}

/** True when we know enough to ask a supplier for a price. */
export function isPriceable(c: SearchCriteria): boolean {
  return Boolean(c.checkIn) && !c.childrenAges.some((a) => a < 0);
}

/** Children need a real age — a supplier prices by age, not by head count. */
export function missingChildAges(c: SearchCriteria): boolean {
  return c.childrenAges.some((a) => !Number.isFinite(a) || a < 0);
}

const dayMonth = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const withYear = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });

/** "16 – 18 Oct", the way the approved design writes a stay. */
export function dateRangeLabel(c: SearchCriteria): string {
  if (!c.checkIn) return 'Choose dates';
  const from = new Date(`${c.checkIn}T00:00:00Z`);
  const to = new Date(`${checkOutOf(c)}T00:00:00Z`);
  const sameMonth = from.getUTCMonth() === to.getUTCMonth() && from.getUTCFullYear() === to.getUTCFullYear();
  return sameMonth
    ? `${from.getUTCDate()} – ${dayMonth.format(to)}`
    : `${dayMonth.format(from)} – ${dayMonth.format(to)}`;
}

export function longDateLabel(iso: string): string {
  return iso ? withYear.format(new Date(`${iso}T00:00:00Z`)) : '';
}

export function nightsLabel(n: number): string {
  return `${n} night${n === 1 ? '' : 's'}`;
}

/** "2 adults · 1 room", plus children when there are any. */
export function guestSummary(c: SearchCriteria): string {
  const parts = [`${c.adults} adult${c.adults === 1 ? '' : 's'}`];
  if (c.childrenAges.length) parts.push(`${c.childrenAges.length} child${c.childrenAges.length === 1 ? '' : 'ren'}`);
  parts.push(`${c.rooms} room${c.rooms === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/** What a price is for, said in full — never a bare number. */
export function priceBasis(c: SearchCriteria): string {
  const people = [
    `${c.adults} adult${c.adults === 1 ? '' : 's'}`,
    c.childrenAges.length ? `${c.childrenAges.length} child${c.childrenAges.length === 1 ? '' : 'ren'}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  return `${nightsLabel(c.nights)} · ${people}`;
}
