import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { liteapi } from './liteapi';
import { hotelbeds } from './hotelbeds';
import { stub } from './stub';
import { convertMoney, convertOffers } from './fx';
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
