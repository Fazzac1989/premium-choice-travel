import 'server-only';

/**
 * The Premium Choice trade platform, as this site's engine (founder, 2026-10-02).
 *
 * Prices, bookings, vouchers and payments for Staycations come from the platform: its hotels
 * (direct contracts, Hotelbeds, Travelopro), priced with the Staycations markup, booked under
 * the brand's own house account. This file is the only place that talks to it. The key is a
 * server secret (PLATFORM_API_KEY) and never reaches a browser; nothing here returns a net
 * rate, because the platform never sends one to a brand.
 */

export class PlatformError extends Error {
  status: number;
  code: string;
  next: string | null;
  constructor(status: number, code: string, message: string, next: string | null) {
    super(message);
    this.status = status;
    this.code = code;
    this.next = next;
  }
}

export function platformConfigured() {
  return Boolean(process.env.PLATFORM_API_URL && process.env.PLATFORM_API_KEY);
}

function base() {
  return (process.env.PLATFORM_API_URL ?? '').replace(/\/+$/, '');
}

export async function platform<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  opts: { timeoutMs?: number; revalidateSeconds?: number } = {},
): Promise<T> {
  if (!platformConfigured()) throw new PlatformError(503, 'not_configured', 'Prices are not available right now.', null);
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${process.env.PLATFORM_API_KEY}`,
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      // prices and bookings are never cached; reference content (photos, descriptions) may be
      ...(opts.revalidateSeconds ? { next: { revalidate: opts.revalidateSeconds } } : { cache: 'no-store' as const }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
  } catch {
    throw new PlatformError(503, 'unavailable', 'We could not reach our booking system just now.', 'Try again in a moment.');
  }
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const e = json?.error ?? {};
    throw new PlatformError(res.status, e.code ?? 'error', e.message ?? 'That did not work.', e.next ?? null);
  }
  return json as T;
}

/** The platform's raw PDF (a voucher), for the site to pass through to its customer. */
export async function platformPdf(path: string): Promise<ArrayBuffer> {
  if (!platformConfigured()) throw new PlatformError(503, 'not_configured', 'Not available right now.', null);
  const res = await fetch(`${base()}${path}`, {
    headers: { authorization: `Bearer ${process.env.PLATFORM_API_KEY}`, accept: 'application/pdf' },
    cache: 'no-store',
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new PlatformError(res.status, 'error', 'The voucher is not ready yet.', 'Try again in a minute.');
  return res.arrayBuffer();
}

/* ------------------------------------------------------------------ shapes */

export type Money = { amount: number; currency: string };

export type PlatformOffer = {
  offerId: string;
  roomName: string;
  board: string;
  refundable: boolean;
  refundDeadline: string | null;
  availabilityMode: 'allotment' | 'freesale' | 'on_request';
  price: { total: Money; perNight: Money };
  priceLockExpiresAt: string;
};

export type PlatformCard = {
  hotelId: string;
  name: string;
  city: string;
  countryCode: string;
  starRating: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  best: PlatformOffer;
  alternatives: PlatformOffer[];
};

export type PlatformSearch = {
  sessionId: string;
  pending: boolean;
  destination: { label: string; cityCode: string | null; hotelId: string | null };
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  page: { limit: number; offset: number; nextOffset: number | null };
  cards: PlatformCard[];
};

export type PlatformQuote = {
  id: string;
  offerId: string;
  hotel: { id: string; name: string; city: string };
  roomName: string;
  board: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  childAges: number[];
  availabilityMode: string;
  refundable: boolean;
  refundDeadline: string | null;
  status: 'active' | 'expired' | 'consumed' | 'released';
  expiresAt: string;
  price: { total: Money; perNight: Money };
};

export type PlatformSuggestion = {
  type: 'city' | 'hotel';
  label: string;
  cityCode: string | null;
  hotelId: string | null;
  country: string;
  hotelCityCode?: string | null;
};

export type SearchFilters = { refundable?: boolean; board?: string[]; minStars?: number };
export type SearchSort = 'best' | 'price' | 'stars';

export type PlatformCheckout = {
  id: string;
  status: 'awaiting_payment' | 'booking' | 'confirmed' | 'failed' | 'expired' | 'needs_attention';
  amount: Money;
  paymentUrl: string | null;
  expiresAt: string;
  booking: { id: string; reference: string } | null;
  message: string | null;
};

/* ------------------------------------------------------------------ calls */

const BOARD: Record<string, string> = {
  RO: 'Room only',
  BB: 'Bed and breakfast',
  HB: 'Half board',
  FB: 'Full board',
  AI: 'All inclusive',
  UAI: 'Ultra all inclusive',
};
export const boardName = (code: string) => BOARD[code] ?? code;

/**
 * Every bookable room for these hotels and dates. The platform answers its own hotels first
 * and the bed banks within seconds; this waits for them (up to `waitMs`) so a customer is not
 * shown half the rooms.
 */
export async function searchHotels(input: {
  destination: { hotelId: string } | { hotelIds: string[] } | { cityCode: string };
  checkIn: string;
  checkOut: string;
  rooms: { adults: number; childAges: number[] }[];
  waitMs?: number;
}): Promise<PlatformSearch> {
  let res = await platform<PlatformSearch>('POST', '/v1/search', {
    destination: input.destination,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rooms: input.rooms,
    currency: 'AED',
    sort: 'price',
    limit: 100,
  });
  const deadline = Date.now() + (input.waitMs ?? 12_000);
  while (res.pending && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 900));
    res = await platform<PlatformSearch>('GET', `/v1/search/${res.sessionId}?sort=price&limit=100`);
  }
  return res;
}

/** Cities and hotels matching what the customer typed (the platform's own catalogue). */
export async function suggestDestinations(q: string): Promise<PlatformSuggestion[]> {
  const out = await platform<{ results: PlatformSuggestion[] }>(
    'GET',
    `/v1/search/destinations?q=${encodeURIComponent(q.slice(0, 80))}`,
    undefined,
    { timeoutMs: 6_000 },
  );
  return out.results;
}

const searchQuery = (o: { sort?: SearchSort; filters?: SearchFilters; offset?: number }) => {
  const p = new URLSearchParams({ sort: o.sort ?? 'best', limit: '30', offset: String(o.offset ?? 0) });
  if (o.filters && Object.keys(o.filters).length) p.set('filters', JSON.stringify(o.filters));
  return p.toString();
};

/** Start a search and return the first page without waiting for every supplier (the page polls). */
export async function startSearch(input: {
  destination: { cityCode: string } | { hotelId: string } | { text: string };
  checkIn: string;
  checkOut: string;
  rooms: { adults: number; childAges: number[] }[];
  sort?: SearchSort;
  filters?: SearchFilters;
}): Promise<PlatformSearch> {
  return platform<PlatformSearch>('POST', '/v1/search', {
    destination: input.destination,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rooms: input.rooms,
    currency: 'AED',
    sort: input.sort ?? 'best',
    limit: 30,
    ...(input.filters && Object.keys(input.filters).length ? { filters: input.filters } : {}),
  });
}

/** The same search again: more suppliers answered, another sort or filter, or the next page. */
export async function readSearch(
  sessionId: string,
  o: { sort?: SearchSort; filters?: SearchFilters; offset?: number } = {},
): Promise<PlatformSearch> {
  return platform<PlatformSearch>('GET', `/v1/search/${sessionId}?${searchQuery(o)}`);
}

/** A quote with its lock status. */
export async function getQuote(id: string): Promise<PlatformQuote> {
  const out = await platform<{ quote: PlatformQuote } | PlatformQuote>('GET', `/v1/quotes/${id}`);
  return 'quote' in out ? out.quote : out;
}

/** Lock today's price for one room: the step before paying. */
export async function quoteOffer(offerId: string): Promise<PlatformQuote> {
  const out = await platform<{ quote: PlatformQuote }>('POST', '/v1/quotes', { offerId });
  return out.quote;
}

export async function startCheckout(input: {
  quoteId: string;
  customer: { email: string; firstName: string; lastName: string; phone?: string; externalId?: string };
  travellers: { firstName: string; lastName: string; type: 'adult' | 'child' }[];
  requests?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PlatformCheckout> {
  return platform<PlatformCheckout>('POST', '/v1/checkouts', { ...input, agreed: true });
}

/** Where a payment stands; asking moves it on once the card is held. */
export async function getCheckout(id: string): Promise<PlatformCheckout> {
  return platform<PlatformCheckout>('GET', `/v1/checkouts/${id}`);
}

export type PlatformBooking = {
  id: string;
  reference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  hotelConfirmation: string | null;
  price: { total: Money };
};

export async function getBooking(id: string): Promise<PlatformBooking> {
  return (await platform<{ booking: PlatformBooking }>('GET', `/v1/bookings/${id}`)).booking;
}

export type CancellationPreview = {
  chargeAmount: Money;
  /** what goes back to the card */
  refund: Money;
  freeUntil: string | null;
  /** false from the check-in day on: no cancelling online */
  changeable: boolean;
};

export async function cancellationPreview(id: string): Promise<CancellationPreview> {
  return platform<CancellationPreview>('GET', `/v1/bookings/${id}/cancellation`);
}

export async function cancelBooking(id: string, acceptedCharge: Money, reason: string) {
  return platform<{ booking: PlatformBooking }>('POST', `/v1/bookings/${id}/cancel`, {
    reason,
    acceptedCharge,
  });
}
