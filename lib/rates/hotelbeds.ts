import { createHash } from 'node:crypto';
import type { RateProvider, RateQuery, RateQuote } from './types';

/**
 * Hotelbeds APItude — the first supplier adapter.
 *
 * Chosen to start with because their test environment issues credentials
 * instantly and without a contract, so the integration can be built and
 * exercised before any commercial commitment. The live environment is the same
 * API with a different host and a signed agreement behind it.
 *
 * Auth is an X-Signature header: sha256(apiKey + secret + unix seconds).
 */

const HOSTS = {
  test: 'https://api.test.hotelbeds.com',
  live: 'https://api.hotelbeds.com',
};

function credentials() {
  const key = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_SECRET;
  const host = HOSTS[process.env.HOTELBEDS_ENV === 'live' ? 'live' : 'test'];
  return key && secret ? { key, secret, host } : null;
}

function signature(key: string, secret: string) {
  return createHash('sha256')
    .update(key + secret + Math.floor(Date.now() / 1000))
    .digest('hex');
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const hotelbeds: RateProvider = {
  name: 'hotelbeds',

  configured() {
    return credentials() !== null;
  },

  async quote(query: RateQuery): Promise<RateQuote | null> {
    const creds = credentials();
    if (!creds) return null;

    const body = {
      stay: { checkIn: query.checkIn, checkOut: addDays(query.checkIn, query.nights) },
      occupancies: [
        {
          rooms: 1,
          adults: query.adults,
          children: query.children,
          // Ages are required when children are present; the enquiry form
          // collects them, and without them the supplier rejects the search.
          ...(query.children > 0 ? { paxes: [] } : {}),
        },
      ],
      hotels: { hotel: [Number(query.supplierCode)] },
    };

    const res = await fetch(`${creds.host}/hotel-api/1.0/hotels`, {
      method: 'POST',
      headers: {
        'Api-key': creds.key,
        'X-Signature': signature(creds.key, creds.secret),
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Hotelbeds ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }

    const json: any = await res.json();
    const hotel = json?.hotels?.hotels?.[0];
    if (!hotel) return null;

    // Every room/rate combination the supplier offered; we quote the cheapest,
    // because the page says "from" and a specialist prices the rest.
    const candidates = (hotel.rooms ?? []).flatMap((room: any) =>
      (room.rates ?? []).map((rate: any) => ({
        amount: Number(rate.net),
        currency: hotel.currency ?? 'EUR',
        board: rate.boardName ?? '',
        roomName: room.name ?? '',
      })),
    );

    const usable = candidates.filter((c: any) => Number.isFinite(c.amount) && c.amount > 0);
    if (!usable.length) return null;

    const cheapest = usable.reduce((a: any, b: any) => (b.amount < a.amount ? b : a));
    return {
      amount: cheapest.amount,
      currency: cheapest.currency,
      nights: query.nights,
      board: cheapest.board,
      roomName: cheapest.roomName,
      provider: 'hotelbeds',
    };
  },
};
