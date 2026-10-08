/**
 * What a customer asks for when they want a holiday.
 *
 * Staycations asks "which emirate, which nights" because the customer is already
 * here. A holiday starts at an airport: the first thing a UAE resident picks is
 * which one they fly from, and everything downstream — the fare, the transfer,
 * the time they lose on the first day — hangs off it.
 *
 * The date helpers are shared with the Staycations search rather than copied;
 * both brands sell to people living on Gulf Standard Time, and "today" has to
 * mean the same day on both sites.
 */
import { addDays, todayInDubai, ymd } from '@/lib/staycations/search-criteria';

export { addDays, todayInDubai, ymd };

export const MAX_NIGHTS = 28;
export const MAX_ADULTS = 9;
export const MAX_CHILDREN = 6;
export const MAX_ROOMS = 4;
export const MAX_CHILD_AGE = 17;

/** How far ahead a holiday may be booked. Carriers rarely load beyond this. */
export const MAX_MONTHS_AHEAD = 11;

export type HolidaySort = 'best' | 'price' | 'stars';

/**
 * What the customer is shopping for (founder, 2026-10-09, after
 * lastminute.com).
 *
 * The trade platform sells hotels, flights, transfers and activities as
 * separate things, so the site should ask which one rather than forcing every
 * search through one package shape.
 *
 *  package — a flight and a hotel together, the flight quoted by a specialist
 *  hotel   — the room alone, no flight implied or promised
 *  flight  — seats only; offered only once the platform can price them
 */
export type SearchMode = 'package' | 'hotel' | 'flight';

export const SEARCH_MODES: { value: SearchMode; label: string; needsOrigin: boolean }[] = [
  { value: 'package', label: 'Flight + Hotel', needsOrigin: true },
  { value: 'hotel', label: 'Hotels', needsOrigin: false },
  { value: 'flight', label: 'Flights', needsOrigin: true },
];

export const isSearchMode = (v: string): v is SearchMode =>
  v === 'package' || v === 'hotel' || v === 'flight';

/**
 * The airports a UAE resident actually leaves from. Order is deliberate: it is
 * the order they are offered, not alphabetical.
 */
export const DEPARTURE_AIRPORTS = [
  { code: 'DXB', city: 'Dubai', name: 'Dubai International' },
  { code: 'AUH', city: 'Abu Dhabi', name: 'Zayed International' },
  { code: 'SHJ', city: 'Sharjah', name: 'Sharjah International' },
  { code: 'DWC', city: 'Dubai', name: 'Al Maktoum International' },
  { code: 'RKT', city: 'Ras Al Khaimah', name: 'Ras Al Khaimah International' },
] as const;

export type AirportCode = (typeof DEPARTURE_AIRPORTS)[number]['code'];

export const isAirport = (code: string): code is AirportCode =>
  DEPARTURE_AIRPORTS.some((a) => a.code === code);

export function airportLabel(code: string): string {
  const a = DEPARTURE_AIRPORTS.find((x) => x.code === code);
  return a ? `${a.city} (${a.code})` : code;
}

export type HolidayCriteria = {
  /** What they are buying. Decides which fields are asked for. */
  mode: SearchMode;
  /** IATA of the airport they fly from. Ignored when the mode is a hotel. */
  origin: AirportCode;
  /** What they typed, e.g. "Maldives" or "Tbilisi". '' means they have not said. */
  destination: string;
  /** The platform's own code for that place, once we have resolved it. */
  cityCode: string;
  /** ISO date they fly out. */
  departDate: string;
  nights: number;
  adults: number;
  /** One age per child, at the date they fly. Length is the child count. */
  childrenAges: number[];
  rooms: number;
  /** Board code filter, '' for any. */
  board: string;
  /** Minimum stars as a string, '' for any. */
  stars: string;
  /** Only rooms that can still be cancelled without charge. */
  refundable: boolean;
  sort: HolidaySort;
};

export const EMPTY_HOLIDAY_CRITERIA: HolidayCriteria = {
  mode: 'package',
  origin: 'DXB',
  destination: '',
  cityCode: '',
  departDate: '',
  nights: 7,
  adults: 2,
  childrenAges: [],
  rooms: 1,
  board: '',
  stars: '',
  refundable: false,
  sort: 'best',
};

/**
 * A real calendar date, not merely a parseable one.
 *
 * `Date.parse('2027-02-31')` does not fail — it rolls over to 3 March — so a
 * well-formed impossible date would otherwise be accepted and then quietly
 * searched for the wrong week. Round-tripping it back to a string catches that.
 */
export const isCalendarDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && ymd(d) === s;
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** A holiday is booked far enough ahead that "tomorrow" is not a sensible default. */
export function defaultDepartDate(): string {
  return ymd(addDaysToDate(todayInDubai(), 21));
}

function addDaysToDate(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/** The last date we will take a search for. */
export function latestDepartDate(): string {
  const d = todayInDubai();
  d.setUTCMonth(d.getUTCMonth() + MAX_MONTHS_AHEAD);
  return ymd(d);
}

export function parseAges(raw: unknown, count?: number): number[] {
  const list = String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => clampInt(s, 0, MAX_CHILD_AGE, 0));
  const n = count === undefined ? list.length : Math.min(count, MAX_CHILDREN);
  return list.slice(0, Math.min(n, MAX_CHILDREN));
}

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, key: string) =>
  (Array.isArray(p[key]) ? (p[key] as string[])[0] : (p[key] as string | undefined)) ?? '';

export function parseHolidayCriteria(params: Params): HolidayCriteria {
  const mode = one(params, 'mode');
  const origin = one(params, 'from').toUpperCase();
  const departDate = one(params, 'depart');
  const childCount = clampInt(one(params, 'children'), 0, MAX_CHILDREN, 0);
  const sort = one(params, 'sort') as HolidaySort;
  return {
    mode: isSearchMode(mode) ? mode : 'package',
    origin: isAirport(origin) ? origin : 'DXB',
    destination: one(params, 'to').slice(0, 80).trim(),
    cityCode: one(params, 'city').slice(0, 20).trim(),
    departDate: isCalendarDate(departDate) ? departDate : '',
    nights: clampInt(one(params, 'nights'), 1, MAX_NIGHTS, 7),
    adults: clampInt(one(params, 'adults'), 1, MAX_ADULTS, 2),
    childrenAges: parseAges(one(params, 'ages'), childCount),
    rooms: clampInt(one(params, 'rooms'), 1, MAX_ROOMS, 1),
    board: one(params, 'board').slice(0, 10),
    stars: one(params, 'stars').slice(0, 2),
    refundable: one(params, 'refundable') === '1',
    sort: sort === 'price' || sort === 'stars' ? sort : 'best',
  };
}

export function holidayQuery(c: Partial<HolidayCriteria>, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  if (c.mode && c.mode !== 'package') p.set('mode', c.mode);
  // A hotel search has no departure airport to carry.
  if (c.origin && c.mode !== 'hotel') p.set('from', c.origin);
  if (c.destination) p.set('to', c.destination);
  if (c.cityCode) p.set('city', c.cityCode);
  if (c.departDate) p.set('depart', c.departDate);
  if (c.nights) p.set('nights', String(c.nights));
  if (c.adults) p.set('adults', String(c.adults));
  if (c.childrenAges?.length) {
    p.set('children', String(c.childrenAges.length));
    p.set('ages', c.childrenAges.join(','));
  }
  if (c.rooms && c.rooms > 1) p.set('rooms', String(c.rooms));
  if (c.board) p.set('board', c.board);
  if (c.stars) p.set('stars', c.stars);
  if (c.refundable) p.set('refundable', '1');
  if (c.sort && c.sort !== 'best') p.set('sort', c.sort);
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p.toString();
}

/** The day they fly home. */
export function returnDateOf(c: HolidayCriteria): string {
  return c.departDate ? addDays(c.departDate, c.nights) : '';
}

/** Enough to ask a supplier for a price. */
export function isSearchable(c: HolidayCriteria): boolean {
  return Boolean((c.destination || c.cityCode) && c.departDate && c.nights > 0 && c.adults > 0);
}

/** A child with no age cannot be priced: suppliers charge by age, not by "child". */
export function missingChildAges(c: HolidayCriteria): boolean {
  return c.childrenAges.some((a) => !Number.isFinite(a) || a < 0);
}

const dayMonth = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const withYear = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function tripDatesLabel(c: HolidayCriteria): string {
  if (!c.departDate) return '';
  const out = new Date(`${c.departDate}T00:00:00Z`);
  const back = new Date(`${returnDateOf(c)}T00:00:00Z`);
  const sameYear = out.getUTCFullYear() === back.getUTCFullYear();
  return `${dayMonth.format(out)} – ${sameYear ? withYear.format(back) : withYear.format(back)}`;
}

export function nightsLabel(n: number): string {
  return `${n} ${n === 1 ? 'night' : 'nights'}`;
}

export function partySummary(c: HolidayCriteria): string {
  const bits = [`${c.adults} ${c.adults === 1 ? 'adult' : 'adults'}`];
  if (c.childrenAges.length)
    bits.push(`${c.childrenAges.length} ${c.childrenAges.length === 1 ? 'child' : 'children'}`);
  if (c.rooms > 1) bits.push(`${c.rooms} rooms`);
  return bits.join(' · ');
}
