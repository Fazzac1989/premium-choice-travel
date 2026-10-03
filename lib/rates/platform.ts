import 'server-only';
import { boardName, platformConfigured, searchHotels, type PlatformOffer } from '@/lib/platform/client';
import type { RateProvider, RateQuery, RateQuote, RoomOffer } from './types';

/**
 * The trade platform as the rates provider (founder, 2026-10-02). A hotel's `supplier_code`
 * holds its id in the platform's catalogue (a uuid).
 * Prices come back already in dirhams with the Staycations markup in them: what the customer
 * pays, and nothing else — the platform never sends a brand its cost.
 *
 * Only instantly bookable rooms are offered: a room the hotel must first agree to (on request)
 * cannot be confirmed the moment the customer pays.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** without real ages a mid-range child keeps the search valid */
const ASSUMED_CHILD_AGE = 8;

export function checkOutOf(checkIn: string, nights: number): string {
  const d = new Date(`${checkIn}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + nights);
  return d.toISOString().slice(0, 10);
}

export function partyOf(q: Pick<RateQuery, 'adults' | 'children' | 'childrenAges'>) {
  const ages = Array.from({ length: q.children }, (_, i) => q.childrenAges?.[i] ?? ASSUMED_CHILD_AGE);
  return [{ adults: q.adults, childAges: ages }];
}

/** minor units → the major units the site shows (AED has two decimals) */
const major = (minor: number) => Math.round(minor) / 100;

export function toRoomOffer(o: PlatformOffer): RoomOffer {
  return {
    offerId: o.offerId,
    roomName: o.roomName,
    board: boardName(o.board),
    refundable: o.refundable,
    cancelBy: o.refundDeadline,
    total: major(o.price.total.amount),
    // a brand is never sent a cost
    net: null,
    currency: o.price.total.currency,
    extraFees: [],
    rateType: 'BOOKABLE',
  };
}

const bookable = (o: PlatformOffer) => o.availabilityMode !== 'on_request';

async function hotelOffers(query: RateQuery): Promise<RoomOffer[]> {
  const res = await searchHotels({
    destination: { hotelId: query.supplierCode },
    checkIn: query.checkIn,
    checkOut: checkOutOf(query.checkIn, query.nights),
    rooms: partyOf(query),
  });
  const card = res.cards.find((c) => c.hotelId === query.supplierCode);
  if (!card) return [];
  return [card.best, ...card.alternatives]
    .filter(bookable)
    .map(toRoomOffer)
    .sort((a, b) => a.total - b.total);
}

export const platformRates: RateProvider = {
  name: 'platform',
  configured: platformConfigured,
  ownsCode: (code: string) => UUID.test(code),

  async quote(query: RateQuery): Promise<RateQuote | null> {
    const [cheapest] = await hotelOffers(query);
    if (!cheapest) return null;
    return {
      amount: cheapest.total,
      currency: cheapest.currency,
      nights: query.nights,
      board: cheapest.board,
      roomName: cheapest.roomName,
      provider: 'platform',
    };
  },

  offers: hotelOffers,
};

/**
 * Price many hotels for one stay in one platform search (up to 100 at a time), never one call
 * per hotel, so a busy results page costs the bed banks one question. Returns each hotel's
 * rooms, cheapest first, keyed by the platform hotel id.
 */
export async function platformSearchMany(
  query: Omit<RateQuery, 'hotelId' | 'supplierCode'>,
  codes: string[],
): Promise<Map<string, RoomOffer[]>> {
  const out = new Map<string, RoomOffer[]>();
  const wanted = Array.from(new Set(codes.filter((c) => UUID.test(c))));
  for (let i = 0; i < wanted.length; i += 100) {
    const batch = wanted.slice(i, i + 100);
    const res = await searchHotels({
      destination: { hotelIds: batch },
      checkIn: query.checkIn,
      checkOut: checkOutOf(query.checkIn, query.nights),
      rooms: partyOf(query),
    });
    for (const card of res.cards)
      out.set(
        card.hotelId,
        [card.best, ...card.alternatives]
          .filter(bookable)
          .map(toRoomOffer)
          .sort((a, b) => a.total - b.total),
      );
  }
  return out;
}
