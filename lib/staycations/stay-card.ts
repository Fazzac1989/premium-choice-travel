import 'server-only';
import type { Hotel } from '@/lib/types';
import type { StayRate } from '@/lib/rates';
import { hotelSlug } from '@/lib/data';
import { hotelPhotoSrc } from '@/lib/images/google-places';
import { priceBand } from '@/lib/price-bands';
import { criteriaQuery, type SearchCriteria } from './search-criteria';

/** Everything one stay card shows, resolved on the server. */
export type StayCardModel = {
  slug: string;
  href: string;
  name: string;
  emirate: string;
  area: string;
  stars: number | null;
  style: string;
  /** A photo we can serve, or null for the branded panel. */
  photo: string | null;
  /** At most two short truths about the stay, e.g. "Breakfast". */
  inclusions: string[];
  featured: boolean;
  /** A real total for the searched dates, or null when we have not priced it. */
  rate: { total: number; currency: string; board: string; roomName: string } | null;
  /** The admin's guidance band — shown only when there is no real total. */
  bandLabel: string | null;
  /** True when the supplier answered "nothing for those dates". */
  soldOut: boolean;
};

const mentions = (h: Hotel, ...words: string[]) => {
  const text = [...(h.features ?? []), h.style ?? ''].join(' ').toLowerCase();
  return words.some((w) => text.includes(w));
};

/**
 * Two things worth knowing at a glance. Board comes from the rate when we
 * have one, because that is what the price actually buys; everything else is
 * a property fact from the curated feature list, never a rate promise.
 */
function inclusionsFor(h: Hotel, rate: StayRate | undefined): string[] {
  const out: string[] = [];
  const board = (rate?.board ?? '').toLowerCase();
  if (board.includes('breakfast')) out.push('Breakfast');
  else if (board.includes('all inclusive')) out.push('All-inclusive');
  else if (board.includes('half board')) out.push('Half board');
  else if (!rate && h.mealPlans.some((m) => /breakfast/i.test(m))) out.push('Breakfast available');

  if (mentions(h, 'private beach')) out.push('Private beach access');
  else if (mentions(h, 'beach')) out.push('Beach access');
  else if (mentions(h, 'private terrace')) out.push('Private terrace');
  else if (mentions(h, 'infinity pool')) out.push('Infinity pool');
  else if (mentions(h, 'pool')) out.push('Pool');

  return out.slice(0, 2);
}

export function toStayCard(
  h: Hotel,
  c: SearchCriteria,
  base: string,
  rates?: { rates: Map<number, StayRate>; unavailable: Set<number> },
): StayCardModel {
  const rate = rates?.rates.get(h.id);
  const photo = (h.photos ?? []).map((p) => hotelPhotoSrc(p, 800)).find(Boolean) || h.image || h.gallery[0] || null;
  const slug = hotelSlug(h.name);
  return {
    slug,
    href: `${base}/hotels/${slug}${criteriaQuery(c)}`,
    name: h.name,
    emirate: h.emirate ?? '',
    area: h.area ?? '',
    stars: h.stars ?? null,
    style: h.style ?? '',
    photo,
    inclusions: inclusionsFor(h, rate),
    featured: Boolean(h.featured),
    rate: rate ? { total: rate.total, currency: rate.currency, board: rate.board, roomName: rate.roomName } : null,
    bandLabel: priceBand(h.priceBand)?.label ?? null,
    soldOut: Boolean(rates?.unavailable.has(h.id)),
  };
}
