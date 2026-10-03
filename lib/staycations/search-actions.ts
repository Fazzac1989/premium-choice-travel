'use server';

import { getAccount } from '@/lib/account';
import { ratesVisible } from '@/lib/rates';
import { PlatformError, quoteOffer, suggestDestinations } from '@/lib/platform/client';
import { curatedByPlatformId, readStaySearch } from './stay-search-server';
import { platformSlug, UAE_DESTINATIONS, type StayResultsPage, type StaySearch } from './stay-search';

/**
 * What the Staycations search pages ask the server for from the browser. The platform key never
 * leaves the server, and live prices are only for signed-in customers (founder, 2026-10-02).
 */

export type PlaceSuggestion = {
  type: 'city' | 'hotel';
  label: string;
  cityCode: string | null;
  /** for a hotel: its page */
  slug: string | null;
};

/** Cities and hotels in the UAE matching what was typed. */
export async function suggestPlaces(q: string): Promise<PlaceSuggestion[]> {
  const text = q.trim();
  if (text.length < 2) return [];
  const cities = UAE_DESTINATIONS.filter((d) => d.label.toLowerCase().includes(text.toLowerCase())).map(
    (d): PlaceSuggestion => ({ type: 'city', label: d.label, cityCode: d.cityCode, slug: null }),
  );
  let hotels: PlaceSuggestion[] = [];
  try {
    const curated = await curatedByPlatformId();
    hotels = (await suggestDestinations(text))
      .filter((r) => r.type === 'hotel' && r.hotelId && r.country === 'AE')
      .slice(0, 8)
      .map((r) => ({
        type: 'hotel' as const,
        label: r.label,
        cityCode: r.hotelCityCode ?? r.cityCode,
        slug: curated.get(r.hotelId!.toLowerCase())?.slug ?? platformSlug(r.label, r.hotelId!),
      }));
  } catch (e) {
    console.warn('[suggest places]', e instanceof Error ? e.message : e);
  }
  return [...cities, ...hotels];
}

/** Read a running search again: more answers, another sort or filter, or the next page. */
export async function pollStaySearch(
  sessionId: string,
  o: { sort: StaySearch['sort']; refundable: boolean; board: string | null; minStars: number | null; offset: number },
): Promise<StayResultsPage> {
  if (!ratesVisible(Boolean(await getAccount())))
    return { sessionId, pending: false, total: 0, nextOffset: null, results: [], problem: 'Please sign in to see prices.' };
  if (!/^[0-9a-f-]{36}$/i.test(sessionId))
    return { sessionId, pending: false, total: 0, nextOffset: null, results: [], problem: 'Search again.' };
  const filters: Record<string, unknown> = {};
  if (o.refundable) filters.refundable = true;
  if (o.board) filters.board = [o.board];
  if (o.minStars) filters.minStars = o.minStars;
  return readStaySearch(sessionId, { sort: o.sort, filters, offset: Math.max(0, Math.floor(o.offset)) });
}

export type LockResult = { ok: true; quoteId: string } | { ok: false; message: string };

/**
 * "Book this room": lock today's price on the platform, which re-checks it with the hotel. The
 * checkout then reads that quote, so nothing about the room or its price comes from the browser.
 */
export async function lockRoom(offerId: string): Promise<LockResult> {
  if (!(await getAccount())) return { ok: false, message: 'Please sign in to book.' };
  if (!/^[0-9a-f-]{36}$/i.test(offerId)) return { ok: false, message: 'Choose a room again.' };
  try {
    const quote = await quoteOffer(offerId);
    return { ok: true, quoteId: quote.id };
  } catch (e) {
    if (e instanceof PlatformError) {
      if (e.code === 'price_changed')
        return { ok: false, message: 'The hotel has just changed the price of this room. Search again to see the new price.' };
      if (e.status === 404 || e.status === 409 || e.status === 410)
        return { ok: false, message: 'That room has just gone. Search again to see what is available now.' };
    }
    console.error('[lock room]', e instanceof Error ? e.message : e);
    return { ok: false, message: 'We could not reach our booking system just now. Please try again in a moment.' };
  }
}
