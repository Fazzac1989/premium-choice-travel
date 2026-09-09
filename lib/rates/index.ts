import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { liteapi } from './liteapi';
import { hotelbeds, hotelbedsSearchMany } from './hotelbeds';
import { stub } from './stub';
import { convertMoney, convertOffers, convertAmount, fxRates, DISPLAY_CURRENCY } from './fx';
import type { DisplayRate, RateProvider, RateQuote, RoomOffer } from './types';

/**
 * The one way the site asks what a hotel costs.
 *
 * Every quote goes through the cache first. That is a commercial requirement,
 * not an optimisation: bed banks measure searches against bookings, and a site
 * that prices every visitor while booking offline is precisely the pattern
 * they throttle. One search should serve everyone looking at that weekend.
 */

// A real supplier always wins; the sample only runs when nothing else is set.
// Hotelbeds first: it is the contracted bed bank, LiteAPI was the sandbox.
const PROVIDERS: RateProvider[] = [hotelbeds, liteapi, stub];

/** How long a quote is treated as good enough to show. */
const CACHE_HOURS = 12;

/**
 * The provider in use. RATES_PROVIDER pins one by name (hotelbeds, liteapi,
 * sample) — useful while two sets of credentials exist — otherwise the first
 * configured one wins.
 */
export function activeProvider(): RateProvider | null {
  const pinned = process.env.RATES_PROVIDER?.trim().toLowerCase();
  if (pinned) {
    const p = PROVIDERS.find((x) => x.name === pinned);
    return p?.configured() ? p : null;
  }
  return PROVIDERS.find((p) => p.configured()) ?? null;
}

/**
 * A supplier code only means something to the catalogue it came from: a
 * LiteAPI "lp…" code sent to Hotelbeds is a bad request, not a quote. A hotel
 * whose code belongs to another provider counts as unmapped for this one.
 */
function codeFor(provider: RateProvider, code: string | null | undefined) {
  if (!code) return null;
  if (provider.ownsCode && !provider.ownsCode(code)) return null;
  return code;
}

export function ratesEnabled() {
  return activeProvider() !== null;
}

/** The cookie a preview visitor carries. */
export const RATES_PREVIEW_COOKIE = 'pct-rates-preview';

/**
 * Whether this visitor may see live prices.
 *
 * Two switches, because "live on the real domain" and "visible to every
 * customer" are different things. While the key is a sandbox one the prices
 * are realistic but not bookable, so a booking request against them is one we
 * might not be able to honour. RATES_PUBLIC=1 opens it to everyone; until
 * then, only someone holding the preview cookie sees it.
 */
export function ratesVisible(hasPreviewCookie: boolean) {
  if (!ratesEnabled()) return false;
  return process.env.RATES_PUBLIC === '1' || hasPreviewCookie;
}

function toDisplay(quote: RateQuote, cached: boolean): DisplayRate {
  return {
    status: 'quoted',
    sample: quote.provider === 'sample',
    perNight: Math.round(quote.amount / Math.max(1, quote.nights)),
    total: Math.round(quote.amount),
    currency: quote.currency,
    nights: quote.nights,
    board: quote.board,
    roomName: quote.roomName,
    cached,
  };
}

export async function getRate(params: {
  hotelId: number;
  supplierCode: string | null;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
}): Promise<DisplayRate> {
  const provider = activeProvider();
  if (!provider) return { status: 'off' };
  const supplierCode = codeFor(provider, params.supplierCode);
  if (!supplierCode) return { status: 'unmapped' };
  if (!isSupabaseConfigured()) return { status: 'off' };

  const children = params.children ?? 0;
  const db = createAdminClient();

  const { data: hit } = await db
    .from('rate_cache')
    .select('*')
    .eq('hotel_id', params.hotelId)
    .eq('check_in', params.checkIn)
    .eq('nights', params.nights)
    .eq('adults', params.adults)
    .eq('children', children)
    .maybeSingle();

  const fresh = hit && Date.now() - new Date(hit.fetched_at).getTime() < CACHE_HOURS * 3600_000;
  if (fresh) {
    if (hit.amount === null) return { status: 'unavailable', cached: true };
    return toDisplay(
      {
        amount: Number(hit.amount),
        currency: hit.currency,
        nights: hit.nights,
        board: hit.board ?? '',
        roomName: hit.room_name ?? '',
        provider: hit.provider,
      },
      true,
    );
  }

  let quote: RateQuote | null = null;
  try {
    quote = await provider.quote({
      hotelId: params.hotelId,
      supplierCode,
      checkIn: params.checkIn,
      nights: params.nights,
      adults: params.adults,
      children,
    });
    // Customers see dirhams whatever currency the supplier trades in.
    if (quote) {
      const money = await convertMoney(quote.amount, quote.currency);
      quote = { ...quote, amount: money.amount, currency: money.currency };
    }
  } catch (e: any) {
    console.error('[rates]', provider.name, e?.message);
    // A failed lookup is not an answer, so it is never cached — but a stale
    // cached quote is better than showing the visitor nothing.
    if (hit && hit.amount !== null) {
      return toDisplay(
        {
          amount: Number(hit.amount),
          currency: hit.currency,
          nights: hit.nights,
          board: hit.board ?? '',
          roomName: hit.room_name ?? '',
          provider: hit.provider,
        },
        true,
      );
    }
    return { status: 'unavailable' };
  }

  await db.from('rate_cache').upsert(
    {
      hotel_id: params.hotelId,
      check_in: params.checkIn,
      nights: params.nights,
      adults: params.adults,
      children,
      currency: quote?.currency ?? 'AED',
      amount: quote ? quote.amount : null,
      board: quote?.board ?? null,
      room_name: quote?.roomName ?? null,
      provider: provider.name,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'hotel_id,check_in,nights,adults,children' },
  );

  return quote ? toDisplay(quote, false) : { status: 'unavailable' };
}

/** Offers move faster than a headline price, so they are held only briefly. */
const OFFER_MINUTES = 30;

/**
 * Room options for a hotel and dates, cached server-side.
 *
 * The cache is not only for the supplier's benefit. The page sends back an
 * offer id when someone asks to book, and the price attached to it is read
 * from here rather than from the browser — so a customer cannot submit a
 * request at a price we never showed.
 */
/**
 * Children's ages, clamped and never longer than the head count. Suppliers
 * price by age, so ages are part of what an offer was for.
 */
export function cleanAges(ages: number[] | undefined, children: number): number[] {
  return (ages ?? [])
    .slice(0, Math.max(0, children))
    .map((n) => Math.max(0, Math.min(17, Math.round(Number(n) || 0))));
}

/**
 * The cache row's `offers` column holds either a bare list (older rows) or
 * `{ages, list}` — the ages the list was priced for. A list priced for other
 * ages is not an answer for this party, so it counts as a miss.
 */
type StoredOffers = RoomOffer[] | { ages?: number[]; list?: RoomOffer[] } | null | undefined;

function unpackOffers(stored: StoredOffers): { ages: string; list: RoomOffer[] } {
  if (!stored) return { ages: '', list: [] };
  if (Array.isArray(stored)) return { ages: '', list: stored };
  return { ages: (stored.ages ?? []).join(','), list: stored.list ?? [] };
}

export type OffersParams = {
  hotelId: number;
  supplierCode: string | null;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
  childrenAges?: number[];
};

export async function getOffers(params: OffersParams, opts: { force?: boolean } = {}): Promise<RoomOffer[]> {
  const provider = activeProvider();
  if (!provider || !isSupabaseConfigured()) return [];
  const supplierCode = codeFor(provider, params.supplierCode);
  if (!supplierCode || !provider.offers) return [];
  const children = params.children ?? 0;
  const ages = cleanAges(params.childrenAges, children);
  const agesKey = ages.join(',');
  const db = createAdminClient();

  const where = {
    hotel_id: params.hotelId,
    check_in: params.checkIn,
    nights: params.nights,
    adults: params.adults,
    children,
  };

  const { data: hit } = await db
    .from('rate_cache')
    .select('offers, offers_fetched_at')
    .match(where)
    .maybeSingle();
  const stored = unpackOffers(hit?.offers as StoredOffers);

  if (
    !opts.force &&
    hit?.offers &&
    hit.offers_fetched_at &&
    stored.ages === agesKey &&
    Date.now() - new Date(hit.offers_fetched_at).getTime() < OFFER_MINUTES * 60_000
  ) {
    return stored.list;
  }

  let offers: RoomOffer[] = [];
  try {
    offers = await convertOffers(
      await provider.offers({
        hotelId: params.hotelId,
        supplierCode,
        checkIn: params.checkIn,
        nights: params.nights,
        adults: params.adults,
        children,
        childrenAges: ages,
      }),
    );
  } catch (e: any) {
    console.error('[offers]', provider.name, e?.message);
    return stored.ages === agesKey ? stored.list : [];
  }

  await db.from('rate_cache').upsert(
    {
      ...where,
      offers: { ages, list: offers },
      offers_fetched_at: new Date().toISOString(),
      provider: provider.name,
      currency: offers[0]?.currency ?? 'AED',
    },
    { onConflict: 'hotel_id,check_in,nights,adults,children' },
  );

  return offers;
}

/** Look one offer back up from the cache — never trust a price from a browser. */
export async function findCachedOffer(params: {
  hotelId: number;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
  offerId: string;
}): Promise<RoomOffer | null> {
  if (!isSupabaseConfigured()) return null;
  const db = createAdminClient();
  const { data } = await db
    .from('rate_cache')
    .select('offers')
    .match({
      hotel_id: params.hotelId,
      check_in: params.checkIn,
      nights: params.nights,
      adults: params.adults,
      children: params.children ?? 0,
    })
    .maybeSingle();
  const { list } = unpackOffers(data?.offers as StoredOffers);
  return list.find((o) => o.offerId === params.offerId) ?? null;
}

// ── Whole-directory search ───────────────────────────────────────

/** The cheapest bookable option for one hotel and one stay. */
export type StayRate = {
  hotelId: number;
  total: number;
  currency: string;
  board: string;
  roomName: string;
  /** True when it came from our cache rather than a fresh supplier call. */
  cached: boolean;
};

export type StaySearch = {
  /** A rate for every hotel the supplier priced. */
  rates: Map<number, StayRate>;
  /** Hotels the supplier answered for with nothing available. */
  unavailable: Set<number>;
  /** False when no supplier is configured, or the search could not run. */
  ok: boolean;
  /** Set when the supplier refused — shown to the visitor in plain words. */
  problem?: string;
};

const EMPTY_SEARCH: StaySearch = { rates: new Map(), unavailable: new Set(), ok: false };

/**
 * Price a whole list of hotels for one stay, in one supplier call.
 *
 * This is the pattern Hotelbeds asks for: as many hotels as possible per
 * availability request, never one call per card. Anything already cached and
 * fresh is reused, so a busy results page usually costs the supplier nothing.
 *
 * Multi-room stays are deliberately not searched — we confirm one room per
 * booking today, and a specialist prices anything larger by hand.
 */
export async function searchStayRates(params: {
  hotels: { id: number; supplierCode: string | null }[];
  checkIn: string;
  nights: number;
  adults: number;
  childrenAges: number[];
  rooms?: number;
}): Promise<StaySearch> {
  const provider = activeProvider();
  if (!provider || provider.name !== 'hotelbeds' || !isSupabaseConfigured()) return EMPTY_SEARCH;
  if ((params.rooms ?? 1) > 1) return EMPTY_SEARCH;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.checkIn)) return EMPTY_SEARCH;

  const children = params.childrenAges.length;
  const ages = cleanAges(params.childrenAges, children);
  const mapped = params.hotels.filter((h) => h.supplierCode && /^\d+$/.test(h.supplierCode));
  if (!mapped.length) return { ...EMPTY_SEARCH, ok: true };

  const db = createAdminClient();
  const rates = new Map<number, StayRate>();
  const unavailable = new Set<number>();

  const { data: cached } = await db
    .from('rate_cache')
    .select('hotel_id, amount, currency, board, room_name, fetched_at')
    .in('hotel_id', mapped.map((h) => h.id))
    .eq('check_in', params.checkIn)
    .eq('nights', params.nights)
    .eq('adults', params.adults)
    .eq('children', children);

  const fresh = new Set<number>();
  for (const row of cached ?? []) {
    if (Date.now() - new Date(row.fetched_at).getTime() > CACHE_HOURS * 3600_000) continue;
    fresh.add(row.hotel_id);
    if (row.amount === null) unavailable.add(row.hotel_id);
    else
      rates.set(row.hotel_id, {
        hotelId: row.hotel_id,
        total: Number(row.amount),
        currency: row.currency,
        board: row.board ?? '',
        roomName: row.room_name ?? '',
        cached: true,
      });
  }

  const missing = mapped.filter((h) => !fresh.has(h.id));
  if (!missing.length) return { rates, unavailable, ok: true };

  const byCode = new Map(missing.map((h) => [Number(h.supplierCode), h.id]));
  let found: Map<number, RoomOffer[]>;
  try {
    found = await hotelbedsSearchMany(
      { checkIn: params.checkIn, nights: params.nights, adults: params.adults, children, childrenAges: ages },
      Array.from(byCode.keys()),
    );
  } catch (e: any) {
    console.error('[stay-search]', e?.message ?? e);
    // Whatever was cached is still worth showing.
    return { rates, unavailable, ok: rates.size > 0, problem: String(e?.message ?? e) };
  }

  // One rate table for the whole batch rather than a lookup per hotel.
  const fx = await fxRates();
  const rows: any[] = [];
  const now = new Date().toISOString();

  for (const [code, hotelId] of Array.from(byCode.entries())) {
    const cheapest = (found.get(code) ?? [])[0];
    if (!cheapest) {
      unavailable.add(hotelId);
      rows.push({
        hotel_id: hotelId,
        check_in: params.checkIn,
        nights: params.nights,
        adults: params.adults,
        children,
        currency: DISPLAY_CURRENCY,
        amount: null,
        board: null,
        room_name: null,
        provider: provider.name,
        fetched_at: now,
      });
      continue;
    }
    const converted =
      cheapest.currency.toUpperCase() === DISPLAY_CURRENCY || !fx
        ? { amount: cheapest.total, currency: cheapest.currency }
        : {
            amount: convertAmount(cheapest.total, cheapest.currency, DISPLAY_CURRENCY, fx) ?? cheapest.total,
            currency: convertAmount(cheapest.total, cheapest.currency, DISPLAY_CURRENCY, fx) === null ? cheapest.currency : DISPLAY_CURRENCY,
          };
    rates.set(hotelId, {
      hotelId,
      total: converted.amount,
      currency: converted.currency,
      board: cheapest.board,
      roomName: cheapest.roomName,
      cached: false,
    });
    rows.push({
      hotel_id: hotelId,
      check_in: params.checkIn,
      nights: params.nights,
      adults: params.adults,
      children,
      currency: converted.currency,
      amount: converted.amount,
      board: cheapest.board || null,
      room_name: cheapest.roomName || null,
      provider: provider.name,
      fetched_at: now,
    });
  }

  if (rows.length) {
    const { error } = await db.from('rate_cache').upsert(rows, { onConflict: 'hotel_id,check_in,nights,adults,children' });
    if (error) console.error('[stay-search cache]', error.message);
  }
  return { rates, unavailable, ok: true };
}
