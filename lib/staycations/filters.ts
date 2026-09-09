import type { Hotel } from '@/lib/types';
import type { SearchCriteria } from './search-criteria';

/**
 * The filters the directory can honestly offer.
 *
 * Every one is backed by a field we actually hold on the hotel — emirate,
 * price band, meal plans, star rating, the curated `bestFor` tags and the
 * hand-written feature list. Nothing here scores, ranks or recommends: we
 * have no data that would make a "recommended" order true.
 */

export type StayTag = {
  key: string;
  label: string;
  /** Shown on the four Explore shortcuts; the rest are filter-only. */
  category?: { title: string; icon: 'wave' | 'dune' | 'spa' | 'family' };
  matches: (h: Hotel) => boolean;
};

const tagged = (h: Hotel, ...tags: string[]) => {
  const list = (h.bestFor ?? []).map((t) => t.toLowerCase());
  return tags.some((t) => list.includes(t));
};

const featured = (h: Hotel, ...words: string[]) => {
  const text = [...(h.features ?? []), h.style ?? ''].join(' ').toLowerCase();
  return words.some((w) => text.includes(w));
};

export const STAY_TAGS: StayTag[] = [
  {
    key: 'beach',
    label: 'By the sea',
    category: { title: 'By the sea', icon: 'wave' },
    matches: (h) => tagged(h, 'beach') || featured(h, 'beach'),
  },
  {
    key: 'desert',
    label: 'Desert quiet',
    category: { title: 'Desert quiet', icon: 'dune' },
    matches: (h) => tagged(h, 'desert') || featured(h, 'desert', 'dune'),
  },
  {
    key: 'spa',
    label: 'Spa breaks',
    category: { title: 'Spa breaks', icon: 'spa' },
    matches: (h) => tagged(h, 'spa') || featured(h, 'spa'),
  },
  {
    key: 'families',
    label: 'Family stays',
    category: { title: 'Family stays', icon: 'family' },
    matches: (h) => tagged(h, 'families', 'kids club'),
  },
  { key: 'couples', label: 'Couples', matches: (h) => tagged(h, 'couples') },
  { key: 'kids club', label: 'Kids’ club', matches: (h) => tagged(h, 'kids club') || featured(h, 'kids club') },
  { key: 'waterpark', label: 'Waterpark', matches: (h) => tagged(h, 'waterpark') || featured(h, 'waterpark') },
  { key: 'pool', label: 'Pool', matches: (h) => featured(h, 'pool') },
  { key: 'luxury', label: 'Luxury', matches: (h) => tagged(h, 'luxury') },
  { key: 'value', label: 'Good value', matches: (h) => tagged(h, 'value') },
  { key: 'long weekend', label: 'Long weekend', matches: (h) => tagged(h, 'long weekend') },
];

export const CATEGORIES = STAY_TAGS.filter((t) => t.category);

export function tagByKey(key: string): StayTag | undefined {
  return STAY_TAGS.find((t) => t.key === key);
}

export const EMIRATES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ras Al Khaimah',
  'Fujairah',
  'Ajman',
  'Umm Al Quwain',
];

export const MEAL_PLANS = ['Room only', 'Bed & breakfast', 'Half board', 'Full board', 'All-inclusive'];

/** Apply the criteria to the directory. Order is decided separately. */
export function filterHotels(hotels: Hotel[], c: SearchCriteria): Hotel[] {
  const tag = c.tag ? tagByKey(c.tag) : undefined;
  return hotels.filter((h) => {
    if (c.emirate && h.emirate !== c.emirate) return false;
    if (c.budget && String(h.priceBand ?? '') !== c.budget) return false;
    if (c.stars && String(h.stars ?? '') !== c.stars) return false;
    if (c.meal && !h.mealPlans.some((m) => m.toLowerCase() === c.meal.toLowerCase())) return false;
    if (tag && !tag.matches(h)) return false;
    return true;
  });
}

/**
 * Sorting. "Price" only means anything once real totals are in hand, so the
 * caller passes what it has; hotels without a total fall to the end rather
 * than being silently ordered by something else.
 */
export function sortHotels(hotels: Hotel[], c: SearchCriteria, totals?: Map<number, number>): Hotel[] {
  const list = [...hotels];
  if (c.sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name));
  if (c.sort === 'stars') {
    return list.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || a.name.localeCompare(b.name));
  }
  // price
  return list.sort((a, b) => {
    const at = totals?.get(a.id);
    const bt = totals?.get(b.id);
    if (at != null && bt != null) return at - bt;
    if (at != null) return -1;
    if (bt != null) return 1;
    // No live totals: the admin-set band is the only honest ordering.
    return (a.priceBand ?? 9) - (b.priceBand ?? 9) || a.name.localeCompare(b.name);
  });
}

/** Which filters are actually set — for the "clear" affordance and counts. */
export function activeFilterCount(c: SearchCriteria): number {
  return [c.emirate, c.budget, c.meal, c.stars, c.tag].filter(Boolean).length;
}
