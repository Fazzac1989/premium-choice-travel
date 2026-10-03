import 'server-only';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import { hotelContent, type HotelContent } from '@/lib/platform/content';
import type { Hotel } from '@/lib/types';
import {
  boardName,
  PlatformError,
  readSearch,
  searchHotels,
  startSearch,
  type PlatformCard,
  type PlatformOffer,
  type PlatformSearch,
  type SearchFilters,
} from '@/lib/platform/client';
import {
  checkOutOf,
  platformIdFromSlug,
  platformSlug,
  type PublicRate,
  type StaySearch,
  type StayResult,
  type StayResultsPage,
} from './stay-search';

/** Only a room that can be confirmed the moment it is paid for is offered (no "on request"). */
export const bookable = (o: PlatformOffer) => o.availabilityMode !== 'on_request';

/** minor units → dirhams */
const major = (minor: number) => Math.round(minor) / 100;

/** The allow-list: what a customer may see of a platform offer. */
export function toPublicRate(o: PlatformOffer): PublicRate {
  return {
    offerId: o.offerId,
    roomName: o.roomName,
    board: boardName(o.board),
    boardCode: o.board,
    refundable: o.refundable,
    refundDeadline: o.refundDeadline,
    total: major(o.price.total.amount),
    perNight: major(o.price.perNight.amount),
    currency: o.price.total.currency,
  };
}

export type CuratedEntry = { slug: string; image: string | null; name: string };

/** Our hand-picked hotels by their platform id: they keep their own page and write-up. */
export async function curatedByPlatformId(): Promise<Map<string, CuratedEntry>> {
  const out = new Map<string, CuratedEntry>();
  for (const h of await getStaycationHotels()) {
    const code = h.supplierCode?.toLowerCase();
    if (code && /^[0-9a-f-]{36}$/.test(code))
      out.set(code, { slug: hotelSlug(h.name), image: h.image || h.gallery[0] || null, name: h.name });
  }
  return out;
}

export function slugFor(card: { hotelId: string; name: string }, curated: Map<string, CuratedEntry>): string {
  return curated.get(card.hotelId.toLowerCase())?.slug ?? platformSlug(card.name, card.hotelId);
}

function toResult(card: PlatformCard, curated: Map<string, CuratedEntry>): StayResult | null {
  const rooms = [card.best, ...card.alternatives].filter(bookable);
  const best = rooms.sort((a, b) => a.price.total.amount - b.price.total.amount)[0];
  if (!best) return null;
  const mine = curated.get(card.hotelId.toLowerCase());
  const stars = card.starRating === null ? null : Math.round(Number(card.starRating));
  return {
    platformHotelId: card.hotelId,
    name: card.name,
    city: card.city,
    stars: stars && stars > 0 ? stars : null,
    image: card.image ?? mine?.image ?? null,
    curated: Boolean(mine),
    slug: slugFor(card, curated),
    best: toPublicRate(best),
    roomCount: rooms.length,
  };
}

export function shapePage(res: PlatformSearch, curated: Map<string, CuratedEntry>): StayResultsPage {
  return {
    sessionId: res.sessionId,
    pending: res.pending,
    total: res.total,
    nextOffset: res.page?.nextOffset ?? null,
    results: res.cards.map((c) => toResult(c, curated)).filter((r): r is StayResult => r !== null),
    problem: null,
  };
}

export function filtersOf(s: Pick<StaySearch, 'refundable' | 'board' | 'minStars'>): SearchFilters {
  const f: SearchFilters = {};
  if (s.refundable) f.refundable = true;
  if (s.board) f.board = [s.board];
  if (s.minStars) f.minStars = s.minStars;
  return f;
}

const failed = (message: string): StayResultsPage => ({
  sessionId: '',
  pending: false,
  total: 0,
  nextOffset: null,
  results: [],
  problem: message,
});

function explain(e: unknown): string {
  if (e instanceof PlatformError && e.status < 500) return `${e.message}${e.next ? ` ${e.next}` : ''}`;
  return 'We could not reach our hotel partners just now. Please try again in a moment.';
}

/** Start the search for a destination and dates; the page keeps reading it while suppliers answer. */
export async function runStaySearch(s: StaySearch): Promise<StayResultsPage> {
  if (!s.cityCode || !s.checkIn) return failed('Choose where and when to see what is available.');
  try {
    const res = await startSearch({
      destination: { cityCode: s.cityCode },
      checkIn: s.checkIn,
      checkOut: checkOutOf(s.checkIn, s.nights),
      rooms: [{ adults: s.adults, childAges: s.childAges.map((a) => Math.max(0, a)) }],
      sort: s.sort,
      filters: filtersOf(s),
    });
    return shapePage(res, await curatedByPlatformId());
  } catch (e) {
    console.error('[stay search]', e instanceof Error ? e.message : e);
    return failed(explain(e));
  }
}

export async function readStaySearch(
  sessionId: string,
  o: { sort: StaySearch['sort']; filters: SearchFilters; offset: number },
): Promise<StayResultsPage> {
  try {
    return shapePage(await readSearch(sessionId, o), await curatedByPlatformId());
  } catch (e) {
    const gone = e instanceof PlatformError && (e.status === 404 || e.status === 410);
    return failed(gone ? 'This search has expired. Search again to see today’s prices.' : explain(e));
  }
}

/* ---------------------------------------------------------------- one hotel */

export type StayHotel = {
  slug: string;
  name: string;
  city: string;
  platformId: string | null;
  curated: Hotel | null;
  content: HotelContent | null;
};

/**
 * A hotel page's hotel: one of ours by its own address (with the platform id it is mapped to),
 * or a platform hotel by the id its address carries. Null when it is neither.
 */
export async function resolveStay(slug: string): Promise<StayHotel | null> {
  const curated = (await getStaycationHotels()).find((h) => hotelSlug(h.name) === slug) ?? null;
  const code = curated?.supplierCode?.toLowerCase() ?? null;
  const platformId = curated ? (code && /^[0-9a-f-]{36}$/.test(code) ? code : null) : platformIdFromSlug(slug);
  if (!curated && !platformId) return null;
  const content = platformId ? await hotelContent(platformId) : null;
  if (!curated && !content) return null;
  return {
    slug,
    name: curated?.name ?? content!.name,
    city: curated?.emirate || content?.city || '',
    platformId,
    curated,
    content,
  };
}

/** Every room that can be booked at once at this hotel for these dates, cheapest first. */
export async function stayRates(platformId: string, s: StaySearch): Promise<{ rates: PublicRate[]; problem: string | null }> {
  if (!s.checkIn) return { rates: [], problem: null };
  try {
    const res = await searchHotels({
      destination: { hotelId: platformId },
      checkIn: s.checkIn,
      checkOut: checkOutOf(s.checkIn, s.nights),
      rooms: [{ adults: s.adults, childAges: s.childAges.map((a) => Math.max(0, a)) }],
    });
    const card = res.cards.find((c) => c.hotelId.toLowerCase() === platformId);
    const rates = card
      ? [card.best, ...card.alternatives].filter(bookable).map(toPublicRate).sort((a, b) => a.total - b.total)
      : [];
    return { rates, problem: null };
  } catch (e) {
    console.error('[stay rates]', e instanceof Error ? e.message : e);
    return { rates: [], problem: explain(e) };
  }
}
