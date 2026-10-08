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

/** How far out to look. Far enough to be bookable, near enough to feel real. */
const LEAD_DAYS = 45;

/**
 * The routes offered. Kept short on purpose: each one is a supplier search
 * every six hours, and a page of eight good cards beats a page of twenty thin
 * ones. Destinations are given as text and resolved by the platform's own
 * catalogue, so a name it does not know simply drops out rather than breaking
 * the row.
 */
const ROUTES: { destination: string; nights: number }[] = [
  { destination: 'Maldives', nights: 4 },
  { destination: 'Phuket', nights: 5 },
  { destination: 'Colombo', nights: 5 },
  { destination: 'Mauritius', nights: 6 },
  { destination: 'Seychelles', nights: 6 },
  { destination: 'Muscat', nights: 3 },
  { destination: 'Tbilisi', nights: 4 },
  { destination: 'Istanbul', nights: 4 },
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

function cheapest(cards: PlatformCard[]): { card: PlatformCard; offer: PlatformOffer } | null {
  let best: { card: PlatformCard; offer: PlatformOffer } | null = null;
  for (const card of cards) {
    const offers = [card.best, ...(Array.isArray(card.alternatives) ? card.alternatives : [])].filter(
      (o): o is PlatformOffer => Boolean(o) && bookable(o),
    );
    for (const offer of offers) {
      if (!best || offer.price.total.amount < best.offer.price.total.amount) best = { card, offer };
    }
  }
  return best;
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
        // Short: a slow supplier costs this card, never the whole grid.
        waitMs: 9_000,
      });
      const pick = cheapest(res.cards ?? []);
      if (!pick) return null;

      const total = major(pick.offer.price.total.amount);
      const deal: Deal = {
        where: res.destination?.label || route.destination,
        hotelId: pick.card.hotelId,
        hotel: pick.card.name,
        stars: pick.card.starRating ? Math.round(Number(pick.card.starRating)) || null : null,
        image: pick.card.image ? sharper(pick.card.image) : null,
        board: pick.offer.board,
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
  const cached = unstable_cache(() => buildDeals(departDate), ['holiday-deals', departDate], {
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
