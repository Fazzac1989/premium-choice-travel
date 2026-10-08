import 'server-only';
import { unstable_cache } from 'next/cache';
import { searchHotels, type PlatformCard, type PlatformOffer } from '@/lib/platform/client';
import { sharper } from '@/lib/platform/content';
import { addDays, todayInDubai, ymd } from './search-criteria';

/**
 * The deals on the front page, taken from live searches.
 *
 * There is no priced inventory to build these from — every holiday in the
 * catalogue reads "price on request" by the founder's decision (2026-10-08) —
 * so the alternative is the only one that cannot go stale: ask the platform
 * what a real week actually costs, a few popular routes at a time.
 *
 * ON CACHING. lib/platform/client refuses to cache a price: "prices and
 * bookings are never cached". That rule is about the booking path and it still
 * holds — nothing here touches it. What is cached is this grid, a teaser,
 * whose figures are indicative and labelled as such; clicking a card runs a
 * fresh live search for the customer's own dates. Caching also bounds what
 * this costs: without it, eight supplier searches would run on every visit to
 * the home page.
 */

/** How long a built grid stands before the next visitor pays for a refresh. */
const TTL_SECONDS = 6 * 60 * 60;

/**
 * Part of the cache key, so changing how a deal is chosen takes effect now
 * rather than in six hours.
 *
 * The data cache outlives a deployment. The first version of this grid shipped
 * a fix for picking guesthouses and went on serving the guesthouse anyway,
 * because the key had not moved and the old entry was still good. Bump this
 * whenever ROUTES or the selection rules change.
 */
const RECIPE = 'v3-routes-trimmed';

/** How far out to look. Far enough to be bookable, near enough to feel real. */
const LEAD_DAYS = 45;

/**
 * The routes offered.
 *
 * Measured against the live platform on 2026-10-09: of Maldives, Phuket,
 * Colombo, Mauritius, Seychelles, Muscat, Tbilisi and Istanbul, only the
 * Maldives returned a hotel, and separately Georgia returned one. Everything
 * else came back empty — the searches ran and found nothing, so this is the
 * supplier's coverage rather than a fault here. The UAE is well served, but
 * Dubai is home to this audience, not a holiday.
 *
 * Kept short on purpose: each one is a supplier search
 * every six hours, and a page of eight good cards beats a page of twenty thin
 * ones. Destinations are given as text and resolved by the platform's own
 * catalogue, so a name it does not know simply drops out rather than breaking
 * the row.
 */
const ROUTES: { destination: string; nights: number }[] = [
  // Answering today.
  { destination: 'Maldives', nights: 4 },
  { destination: 'Georgia', nights: 5 },
  // Not yet, and kept so the grid grows by itself the day they are. Two
  // searches every six hours is a cheap price for not having to remember.
  { destination: 'Thailand', nights: 6 },
  { destination: 'Sri Lanka', nights: 6 },
];

export type Deal = {
  /** The place as the platform names it, e.g. "Malé, MV". */
  where: string;
  hotelId: string;
  hotel: string;
  stars: number | null;
  image: string | null;
  board: string;
  nights: number;
  checkIn: string;
  /** e.g. "4 nights in November" */
  when: string;
  /** Per person, two sharing, in dirhams. Hotel only. */
  perPerson: number;
  /** The whole room for the stay. */
  total: number;
  /** What the customer searched to get here, so the card can link to it. */
  query: { to: string; depart: string; nights: number };
};

const major = (minor: number) => Math.round(minor) / 100;
const bookable = (o: PlatformOffer) => o.availabilityMode !== 'on_request';

const monthOf = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long' });

/** Hotels worth putting on the front page. */
const GOOD_ENOUGH = 4;

/**
 * The best-value card for a destination.
 *
 * Not simply the cheapest: the cheapest room in the Maldives is a guesthouse
 * at AED 354 room-only, which is a true price and the wrong advertisement for
 * this brand. So this takes the cheapest room in a hotel of four stars or
 * better, and falls back to the cheapest of anything only when a destination
 * has nothing rated — better a modest card than an empty column.
 */
export function pick(cards: PlatformCard[]): { card: PlatformCard; offer: PlatformOffer } | null {
  const cheapestIn = (from: PlatformCard[]) => {
    let best: { card: PlatformCard; offer: PlatformOffer } | null = null;
    for (const card of from) {
      const offers = [card.best, ...(Array.isArray(card.alternatives) ? card.alternatives : [])].filter(
        (o): o is PlatformOffer => Boolean(o) && bookable(o),
      );
      for (const offer of offers) {
        if (!best || offer.price.total.amount < best.offer.price.total.amount) best = { card, offer };
      }
    }
    return best;
  };

  const rated = cards.filter((c) => Number(c.starRating) >= GOOD_ENOUGH);
  return cheapestIn(rated) ?? cheapestIn(cards);
}

async function buildDeals(departDate: string): Promise<Deal[]> {
  const settled = await Promise.allSettled(
    ROUTES.map(async (route) => {
      const checkOut = addDays(departDate, route.nights);
      const res = await searchHotels({
        destination: { text: route.destination },
        checkIn: departDate,
        checkOut,
        rooms: [{ adults: 2, childAges: [] }],
        /**
         * A city search genuinely takes this long. The platform repo raised
         * its own wait to 20 s for exactly this reason ("the test environment
         * took over 10 s", 2026-10-03); an earlier 9 s here returned one route
         * out of eight. The cost of waiting falls on a six-hourly refresh, not
         * on each visitor, and the grid streams so nothing else is held up.
         */
        waitMs: 25_000,
      });
      const chosen = pick(res.cards ?? []);
      if (!chosen) return null;

      const total = major(chosen.offer.price.total.amount);
      const deal: Deal = {
        where: res.destination?.label || route.destination,
        hotelId: chosen.card.hotelId,
        hotel: chosen.card.name,
        stars: chosen.card.starRating ? Math.round(Number(chosen.card.starRating)) || null : null,
        image: chosen.card.image ? sharper(chosen.card.image) : null,
        board: chosen.offer.board,
        nights: route.nights,
        checkIn: departDate,
        when: `${route.nights} nights in ${monthOf(departDate)}`,
        perPerson: Math.round(total / 2),
        total,
        query: { to: route.destination, depart: departDate, nights: route.nights },
      };
      return deal;
    }),
  );

  return settled
    .filter((s): s is PromiseFulfilledResult<Deal | null> => s.status === 'fulfilled')
    .map((s) => s.value)
    .filter((d): d is Deal => d !== null)
    .sort((a, b) => a.perPerson - b.perPerson);
}

/**
 * The grid, cached for six hours.
 *
 * The departure date is part of the key, so the grid rolls forward on its own
 * each day rather than quietly advertising a week that has passed.
 */
export async function holidayDeals(): Promise<{ deals: Deal[]; departDate: string }> {
  const departDate = addDays(ymd(todayInDubai()), LEAD_DAYS);
  const cached = unstable_cache(() => buildDeals(departDate), ['holiday-deals', RECIPE, departDate], {
    revalidate: TTL_SECONDS,
    tags: ['holiday-deals'],
  });
  try {
    return { deals: await cached(), departDate };
  } catch {
    // A grid that cannot be built is simply not shown; it is a teaser, and the
    // search below it is the real way in.
    return { deals: [], departDate };
  }
}
