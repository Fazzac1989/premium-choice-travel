import type { RateProvider, RateQuery, RateQuote } from './types';

/**
 * LiteAPI (Nuitée Connect) — a self-service hotel rate feed.
 *
 * Chosen because it needs no supplier contract: a free sandbox key is issued
 * on signup, and production is a card rather than a negotiation. That matters
 * here — Premium Choice wants to show prices without becoming an online
 * travel agent.
 *
 * Uses the min-rates endpoint, which returns only the cheapest rate per hotel.
 * It is the endpoint built for exactly this — showing a "from" price — and it
 * is far cheaper on the supplier's search budget than a full rate search we
 * would then throw most of away.
 *
 * IMPORTANT: `price` is the net cost, i.e. what Premium Choice would pay.
 * `suggestedSellingPrice` is the retail figure. Only the latter is ever shown
 * to a customer; displaying net would publish the buying price.
 */

const BASE = 'https://api.liteapi.travel/v3.0';

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const liteapi: RateProvider = {
  name: 'liteapi',

  configured() {
    return Boolean(process.env.LITEAPI_KEY);
  },

  async quote(query: RateQuery): Promise<RateQuote | null> {
    const key = process.env.LITEAPI_KEY;
    if (!key) return null;

    const res = await fetch(`${BASE}/hotels/min-rates`, {
      method: 'POST',
      headers: { 'X-API-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        hotelIds: [query.supplierCode],
        occupancies: [
          {
            adults: query.adults,
            // Ages are wanted rather than a count; without real ages a
            // mid-range child age keeps the search valid.
            children: Array.from({ length: query.children }, () => 8),
          },
        ],
        checkin: query.checkIn,
        checkout: addDays(query.checkIn, query.nights),
        currency: 'AED',
        // Rates vary by the guest's nationality; our customers are residents.
        guestNationality: 'AE',
        timeout: 8,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`LiteAPI ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }

    const json: any = await res.json();
    const row = (json?.data ?? []).find((d: any) => String(d.hotelId) === String(query.supplierCode));
    if (!row) return null;

    // Retail, never net.
    const amount = Number(row.suggestedSellingPrice ?? row.price);
    if (!Number.isFinite(amount) || amount <= 0) return null;

    return {
      amount,
      currency: 'AED',
      nights: query.nights,
      // min-rates trades detail for cost: no board or room name comes back,
      // and the page is written to read correctly without them.
      board: '',
      roomName: '',
      provider: 'liteapi',
    };
  },
};
