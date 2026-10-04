import type { Package } from '@/lib/types';

/**
 * Ways into the catalogue, the way a package-holiday site offers them
 * (founder, 2026-10-04, after Jet2's menu).
 *
 * The catalogue cannot be grouped by a field, because `category` is free text —
 * 48 holidays carry 23 different values, including "Island-hopping" and "Island
 * hopping" as separate things, and `board_basis` is a sentence rather than a
 * code. So each collection states its own rule here, where it can be read and
 * argued with, instead of pretending the data is tidier than it is.
 *
 * Every rule matches on what a holiday actually says about itself. None of them
 * asserts anything the catalogue does not: there is no "best in spring"
 * collection, because nothing in the data knows that. The seasonal collections
 * exist only where the catalogue itself carries a season.
 */

export type Collection = {
  slug: string;
  title: string;
  /** One line under the heading. */
  blurb: string;
  /** Which holidays belong. Reviewable, and deliberately narrow. */
  match: (p: Package) => boolean;
};

export type CollectionGroup = {
  heading: string;
  items: Collection[];
};

/**
 * Collections a holiday has been put in by hand, in `details.collections`.
 *
 * `category` is what a holiday *is*, and it shows on the card. This is where it
 * also *belongs*, which is a different question and often several answers: an
 * adults-only overwater villa is a beach holiday on its card and a couples
 * holiday in the menu. Keeping them apart means a commercial decision about
 * where something is offered never rewrites what a customer reads about it.
 *
 * A tag is only ever added to what the rules already find, never subtracted.
 */
const tags = (p: Package): string[] => {
  const raw = (p.details as Record<string, unknown> | undefined)?.collections;
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
};

export const taggedInto = (p: Package, slug: string) => tags(p).includes(slug);

/** Anything a holiday says about itself, lower-cased, for matching. */
const words = (p: Package) =>
  [p.title, p.tagline, p.category, p.boardBasis ?? '', ...(p.highlights ?? [])]
    .join(' ')
    .toLowerCase();

/** Matches only the category, where the catalogue's own label is the point. */
const cat = (p: Package) => (p.category ?? '').toLowerCase();

const has = (p: Package, re: RegExp) => re.test(words(p));

export const COLLECTION_GROUPS: CollectionGroup[] = [
  {
    heading: 'Popular holiday types',
    items: [
      {
        slug: 'all-inclusive',
        title: 'All inclusive holidays',
        blurb: 'Meals and drinks settled before you land, so the only thing left to decide is lunch.',
        match: (p) => has(p, /all.?inclusive/),
      },
      {
        slug: 'beach-and-islands',
        title: 'Beach and island holidays',
        blurb: 'Somewhere to stop. Indian Ocean sand, Thai islands and the quieter Mediterranean.',
        match: (p) => /beach|island/.test(cat(p)),
      },
      {
        slug: 'multi-centre',
        title: 'Multi-centre holidays',
        blurb: 'Two or three places in one trip, with the moving between them already arranged.',
        match: (p) => /multi-centre|twin-centre|two-island|island.?hopping/.test(cat(p)),
      },
      {
        slug: 'touring',
        title: 'Touring holidays',
        blurb: 'A route rather than a resort, with a driver and a guide who know the road.',
        match: (p) => /touring|road trip/.test(cat(p)),
      },
      {
        slug: 'safari',
        title: 'Safari holidays',
        blurb: 'Game drives at the hours the animals keep, and a beach at the end of it.',
        match: (p) => /safari/.test(cat(p)),
      },
      {
        slug: 'rail-journeys',
        title: 'Rail journeys',
        blurb: 'The Rockies, the Alps and Japan, taken at the speed of the window.',
        match: (p) => /rail/.test(cat(p)),
      },
    ],
  },
  {
    heading: 'Holidays for everyone',
    items: [
      {
        slug: 'family',
        title: 'Family holidays',
        blurb: 'Built around what children will actually sit through, and where adults can still eat well.',
        match: (p) => /family/.test(cat(p)),
      },
      {
        slug: 'couples',
        title: 'Couples and honeymoons',
        blurb: 'Quieter hotels, later breakfasts, and rooms worth staying in.',
        match: (p) => /couple|honeymoon/.test(cat(p)),
      },
      {
        slug: 'culture',
        title: 'Culture and heritage',
        blurb: 'Cities, ruins and the people who can explain them without reading from a board.',
        match: (p) => /culture|cultural|heritage/.test(cat(p)),
      },
      {
        slug: 'wellness',
        title: 'Wellness and spa',
        blurb: 'Somewhere designed around sleeping properly and eating carefully.',
        match: (p) => /wellness|spa|retreat/.test(cat(p)) || has(p, /wellness|retreat/),
      },
    ],
  },
  {
    heading: 'Time of year',
    items: [
      // No "Winter sun" collection. It is a Northern European idea — escaping a
      // grey December — and December is the good season here. What a UAE
      // resident needs to escape is July, which is the collection below.
      {
        slug: 'escape-the-heat',
        title: 'Escape the summer heat',
        blurb: 'Mountains, lakes and northern light, for when Dubai is at its hottest.',
        match: (p) => /cool summer|winter adventure/.test(cat(p)),
      },
      {
        slug: 'festive',
        title: 'Christmas and New Year',
        blurb: 'Markets, snow and somewhere to be on the thirty-first.',
        match: (p) => /festive/.test(cat(p)) || has(p, /christmas|new year|festive/),
      },
      {
        slug: 'short-breaks',
        title: 'Short breaks',
        blurb: 'A week or less, for the long weekends the UAE calendar hands you.',
        match: (p) => p.nights > 0 && p.nights <= 7,
      },
      {
        slug: 'long-holidays',
        title: 'Longer journeys',
        blurb: 'Ten nights and over, for the trips worth taking the annual leave for.',
        match: (p) => p.nights >= 10,
      },
    ],
  },
];

export const ALL_COLLECTIONS: Collection[] = COLLECTION_GROUPS.flatMap((g) => g.items);

export function collectionBySlug(slug: string): Collection | null {
  return ALL_COLLECTIONS.find((c) => c.slug === slug) ?? null;
}

/**
 * Does this holiday belong here — by its own words, or because somebody said so?
 *
 * Every read goes through this rather than calling a collection's `match`
 * directly, so a hand-placed holiday cannot appear in the menu's count and then
 * be missing from the page, or the other way round.
 */
export const belongsIn = (collection: Collection, p: Package) =>
  collection.match(p) || taggedInto(p, collection.slug);

/**
 * The holidays in a collection, featured first and then alphabetically, so the
 * order is deliberate rather than whatever the database happened to return.
 */
export function packagesIn(collection: Collection, packages: Package[]): Package[] {
  return packages
    .filter((p) => belongsIn(collection, p))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
}

/** Collections that would not be empty, which are the only ones worth offering. */
export function groupsWithContent(packages: Package[]): CollectionGroup[] {
  return COLLECTION_GROUPS.map((g) => ({
    heading: g.heading,
    items: g.items.filter((c) => packages.some((p) => belongsIn(c, p))),
  })).filter((g) => g.items.length > 0);
}
