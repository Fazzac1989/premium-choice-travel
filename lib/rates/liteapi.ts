import type { RateProvider, RateQuery, RateQuote, RoomOffer } from './types';

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

  // LiteAPI ids look like "lp42f57"; a bare number belongs to Hotelbeds.
  ownsCode(code: string) {
    return /^lp/i.test(code);
  },

  offers(query: RateQuery) {
    return liteapiOffers(query);
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

/**
 * Room-level offers for one hotel and one set of dates.
 *
 * Separate from quote() because it is a heavier call — a full rate search
 * rather than the cheapest-only endpoint — and is only made once a customer
 * has chosen dates and asked to see rooms.
 */
export async function liteapiOffers(query: RateQuery): Promise<RoomOffer[]> {
  const key = process.env.LITEAPI_KEY;
  if (!key) return [];

  const res = await fetch(`${BASE}/hotels/rates`, {
    method: 'POST',
    headers: { 'X-API-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      hotelIds: [query.supplierCode],
      occupancies: [
        { adults: query.adults, children: Array.from({ length: query.children }, () => 8) },
      ],
      checkin: query.checkIn,
      checkout: addDays(query.checkIn, query.nights),
      currency: 'AED',
      guestNationality: 'AE',
      maxRatesPerHotel: 12,
      timeout: 10,
    }),
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`LiteAPI ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const json: any = await res.json();
  const roomTypes = json?.data?.[0]?.roomTypes ?? [];
  const offers: RoomOffer[] = [];

  for (const rt of roomTypes) {
    const rate = rt?.rates?.[0];
    if (!rate || !rt.offerId) continue;

    // suggestedSellingPrice is the customer figure; retailRate.total is cost.
    const sell = Number(rate.retailRate?.suggestedSellingPrice?.[0]?.amount);
    const net = Number(rate.retailRate?.total?.[0]?.amount);
    const total = Number.isFinite(sell) && sell > 0 ? sell : net;
    if (!Number.isFinite(total) || total <= 0) continue;

    const tag = rate.cancellationPolicies?.refundableTag;
    offers.push({
      offerId: String(rt.offerId),
      roomName: String(rate.name ?? rt.name ?? 'Room'),
      board: String(rate.boardName ?? rate.boardType ?? ''),
      refundable: tag === 'RFN' ? true : tag === 'NRFN' ? false : null,
      cancelBy: rate.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime ?? null,
      total: Math.round(total * 100) / 100,
      net: Number.isFinite(net) ? Math.round(net * 100) / 100 : null,
      currency: 'AED',
      // Anything the supplier flags as collected at the hotel has to be said
      // out loud, or the price on the page is not the price they pay.
      extraFees: (rate.retailRate?.taxesAndFees ?? [])
        .filter((f: any) => f && f.included === false && Number(f.amount) > 0)
        .map((f: any) => ({
          description: String(f.description ?? 'fee').replace(/_/g, ' '),
          amount: Math.round(Number(f.amount) * 100) / 100,
          currency: String(f.currency ?? 'AED'),
        })),
    });
  }

  // Cheapest first, and drop duplicate room+board+price rows the supplier
  // often returns for the same physical room.
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
