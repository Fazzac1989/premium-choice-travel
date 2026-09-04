import { createHash } from 'node:crypto';
import type { RateProvider, RateQuery, RateQuote, RoomOffer } from './types';

/**
 * Hotelbeds APItude — hotel availability, room offers and (for the mapping
 * script) the content catalogue.
 *
 * Auth is a per-request X-Signature: sha256(apiKey + secret + unix seconds).
 * The test environment answers with a small set of demo hotels and allows
 * 50 requests a day, which is why every caller here is deliberately frugal
 * and the catalogue is cached to disk by the mapping script.
 *
 * Money: `net` is what Premium Choice pays. A customer never sees it. The
 * figure shown is `sellingRate` when the account is set up to return one,
 * otherwise net plus HOTELBEDS_MARKUP_PERCENT (default 15). Prices come back
 * in the account's currency; lib/rates/index.ts converts them to dirhams.
 */

const HOSTS = {
  test: 'https://api.test.hotelbeds.com',
  live: 'https://api.hotelbeds.com',
};

/** Content API image paths are relative to this. */
export const HOTELBEDS_PHOTO_BASE = 'https://photos.hotelbeds.com/giata/bigger/';

const DEFAULT_MARKUP_PERCENT = 15;
/** Without real ages a mid-range child keeps the search valid, as LiteAPI does. */
const ASSUMED_CHILD_AGE = 8;

export function hotelbedsCredentials() {
  const key = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_SECRET;
  const env = process.env.HOTELBEDS_ENV === 'live' ? 'live' : 'test';
  return key && secret ? { key, secret, host: HOSTS[env], env } : null;
}

function signature(key: string, secret: string) {
  return createHash('sha256')
    .update(key + secret + Math.floor(Date.now() / 1000))
    .digest('hex');
}

export class HotelbedsError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(`Hotelbeds ${status}: ${detail}`);
    this.status = status;
  }
  /** The daily test quota (50) is spent, or the key is not allowed here. */
  get quotaOrForbidden() {
    return this.status === 403 || this.status === 429;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One signed call. `path` starts with /hotel-api or /hotel-content-api.
 *
 * Hotelbeds also limits requests per second, separately from the daily
 * quota, and answers a burst with 429 "Rate limit exceeded". That is worth
 * a short wait and one more try; a 403 (quota spent, key refused) is not.
 */
export async function hotelbedsFetch<T = any>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const creds = hotelbedsCredentials();
  if (!creds) throw new Error('HOTELBEDS_API_KEY / HOTELBEDS_SECRET are not set');
  const waits = [1500, 3500];
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${creds.host}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Api-key': creds.key,
        'X-Signature': signature(creds.key, creds.secret),
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
    if (res.ok) return (await res.json()) as T;
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 429 && attempt < waits.length) {
      await sleep(waits[attempt]);
      continue;
    }
    throw new HotelbedsError(res.status, detail);
  }
}

/** GET /hotel-api/1.0/status — the cheapest way to prove the credentials work. */
export async function hotelbedsStatus(): Promise<{ ok: boolean; detail: string }> {
  try {
    const json: any = await hotelbedsFetch('/hotel-api/1.0/status');
    return { ok: json?.status === 'OK', detail: JSON.stringify(json).slice(0, 200) };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? String(e) };
  }
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function markupPercent() {
  const n = Number(process.env.HOTELBEDS_MARKUP_PERCENT);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_MARKUP_PERCENT;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Customer price for a rate: the supplier's selling rate if it gives one, else net plus margin. */
function sellPrice(rate: any): { total: number; net: number | null } {
  const net = Number(rate?.net);
  const selling = Number(rate?.sellingRate);
  if (Number.isFinite(selling) && selling > 0) return { total: round2(selling), net: Number.isFinite(net) ? round2(net) : null };
  if (!Number.isFinite(net) || net <= 0) return { total: 0, net: null };
  return { total: round2(net * (1 + markupPercent() / 100)), net: round2(net) };
}

/** Availability request body. Children need ages or the supplier rejects the search. */
function availabilityBody(query: RateQuery) {
  const ages = Array.from({ length: query.children }, (_, i) => query.childrenAges?.[i] ?? ASSUMED_CHILD_AGE);
  return {
    stay: { checkIn: query.checkIn, checkOut: addDays(query.checkIn, query.nights) },
    occupancies: [
      {
        rooms: 1,
        adults: query.adults,
        children: query.children,
        ...(query.children > 0
          ? {
              paxes: [
                ...Array.from({ length: query.adults }, () => ({ type: 'AD' })),
                ...ages.map((age) => ({ type: 'CH', age })),
              ],
            }
          : {}),
      },
    ],
    hotels: { hotel: [Number(query.supplierCode)] },
    language: 'ENG',
    // Rates vary by the guest's market; our customers are UAE residents.
    sourceMarket: 'AE',
  };
}

/** Every room/rate pair the supplier offered for one hotel, as our offer shape. */
function toOffers(hotel: any): RoomOffer[] {
  const currency = String(hotel?.currency ?? 'EUR');
  const offers: RoomOffer[] = [];
  for (const room of hotel?.rooms ?? []) {
    for (const rate of room?.rates ?? []) {
      if (!rate?.rateKey) continue;
      const { total, net } = sellPrice(rate);
      if (total <= 0) continue;

      // NRF = non-refundable; anything else has cancellation terms of its own.
      const nonRefundable = rate.rateClass === 'NRF';
      const policies: any[] = Array.isArray(rate.cancellationPolicies) ? rate.cancellationPolicies : [];
      const firstDeadline = policies
        .map((p) => String(p?.from ?? ''))
        .filter(Boolean)
        .sort()[0];

      const payAtHotel = rate.paymentType === 'AT_HOTEL';
      const extraFees = ((rate.taxes?.taxes ?? []) as any[])
        .filter((t) => t && t.included === false && Number(t.amount) > 0)
        .map((t) => ({
          // The page itself adds "paid at the hotel", so this is just the what.
          description: String(t.type ?? 'taxes and fees').toLowerCase().replace(/_/g, ' '),
          amount: round2(Number(t.amount)),
          currency: String(t.currency ?? currency),
        }));

      offers.push({
        offerId: String(rate.rateKey),
        roomName: `${String(room.name ?? 'Room')}${payAtHotel ? ' (pay at the hotel)' : ''}`,
        board: String(rate.boardName ?? rate.boardCode ?? ''),
        refundable: nonRefundable ? false : firstDeadline ? true : null,
        cancelBy: nonRefundable ? null : firstDeadline ?? null,
        total,
        net,
        currency,
        extraFees,
      });
    }
  }

  const seen = new Set<string>();
  return offers
    .sort((a, b) => a.total - b.total)
    .filter((o) => {
      const k = `${o.roomName}|${o.board}|${o.refundable}|${o.total}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

/** Exposed for tests: an availability `hotel` object → our offers. */
export const hotelbedsOffersFromHotel = toOffers;

async function availability(query: RateQuery): Promise<any | null> {
  const json: any = await hotelbedsFetch('/hotel-api/1.0/hotels', { method: 'POST', body: availabilityBody(query) });
  return json?.hotels?.hotels?.[0] ?? null;
}

export const hotelbeds: RateProvider = {
  name: 'hotelbeds',

  configured() {
    return hotelbedsCredentials() !== null;
  },

  // Hotelbeds hotel codes are plain integers; LiteAPI's start with "lp".
  ownsCode(code: string) {
    return /^\d+$/.test(code);
  },

  async quote(query: RateQuery): Promise<RateQuote | null> {
    if (!hotelbeds.ownsCode!(query.supplierCode)) return null;
    const hotel = await availability(query);
    if (!hotel) return null;
    const cheapest = toOffers(hotel)[0];
    if (!cheapest) return null;
    return {
      amount: cheapest.total,
      currency: cheapest.currency,
      nights: query.nights,
      board: cheapest.board,
      roomName: cheapest.roomName,
      provider: 'hotelbeds',
    };
  },

  async offers(query: RateQuery): Promise<RoomOffer[]> {
    if (!hotelbeds.ownsCode!(query.supplierCode)) return [];
    const hotel = await availability(query);
    return hotel ? toOffers(hotel) : [];
  },
};

/**
 * Re-check one rate before a request goes to a specialist. RECHECK-type rates
 * may move between search and booking; this is the supplier's own answer.
 */
export async function hotelbedsCheckRate(rateKey: string): Promise<RoomOffer | null> {
  const json: any = await hotelbedsFetch('/hotel-api/1.0/checkrates', { method: 'POST', body: { rooms: [{ rateKey }] } });
  const hotel = json?.hotel;
  return hotel ? toOffers(hotel)[0] ?? null : null;
}

// ── Content API (used by scripts/map-hotelbeds-hotels.ts) ────────────

export type HotelbedsDestination = { code: string; name: string; countryCode: string };
export type HotelbedsHotel = {
  code: number;
  name: string;
  destinationCode: string;
  zoneCode?: number;
  categoryCode?: string;
  latitude: number | null;
  longitude: number | null;
  address?: string;
};

/** GET /hotel-content-api/1.0/locations/destinations — one call per country. */
export async function hotelbedsDestinations(countryCode = 'AE'): Promise<HotelbedsDestination[]> {
  const json: any = await hotelbedsFetch(
    `/hotel-content-api/1.0/locations/destinations?countryCodes=${countryCode}&fields=code,name,countryCode&language=ENG&from=1&to=500`,
  );
  return (json?.destinations ?? []).map((d: any) => ({
    code: String(d.code),
    name: String(d.name?.content ?? d.code),
    countryCode: String(d.countryCode ?? countryCode),
  }));
}

/**
 * GET /hotel-content-api/1.0/hotels for one destination, paged 1000 at a
 * time. Returns the light fields a name-and-location match needs.
 */
export async function hotelbedsHotelsIn(destinationCode: string): Promise<HotelbedsHotel[]> {
  const out: HotelbedsHotel[] = [];
  const PAGE = 1000;
  for (let from = 1; ; from += PAGE) {
    const json: any = await hotelbedsFetch(
      `/hotel-content-api/1.0/hotels?destinationCode=${encodeURIComponent(destinationCode)}` +
        `&fields=code,name,destinationCode,zoneCode,categoryCode,coordinates,address&language=ENG&from=${from}&to=${from + PAGE - 1}`,
    );
    const rows: any[] = json?.hotels ?? [];
    for (const h of rows) {
      out.push({
        code: Number(h.code),
        name: String(h.name?.content ?? h.name ?? ''),
        destinationCode: String(h.destinationCode ?? destinationCode),
        zoneCode: h.zoneCode != null ? Number(h.zoneCode) : undefined,
        categoryCode: h.categoryCode ? String(h.categoryCode) : undefined,
        latitude: Number.isFinite(Number(h.coordinates?.latitude)) ? Number(h.coordinates.latitude) : null,
        longitude: Number.isFinite(Number(h.coordinates?.longitude)) ? Number(h.coordinates.longitude) : null,
        address: h.address?.content ? String(h.address.content) : undefined,
      });
    }
    const total = Number(json?.total ?? rows.length);
    if (rows.length < PAGE || from + PAGE > total) break;
  }
  return out;
}
