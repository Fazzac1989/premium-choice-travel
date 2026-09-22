import { describe, expect, it } from 'vitest';
import {
  checkPackages,
  movePackageInOrder,
  packageOrderOf,
  pagesForPackage,
  planPages,
  reorderPages,
} from '@/lib/package-brochure/plan';
import {
  groupSpreads,
  introSummary,
  orderByRegion,
  paginateContents,
  type PackageSpread,
} from '@/lib/package-brochure/spreads';
import type { BrochurePackage } from '@/lib/package-brochure/data';

/** A package with only the fields under test filled in. */
const pkg = (over: Partial<BrochurePackage> = {}): BrochurePackage => ({
  id: 1,
  slug: 'p',
  title: 'A journey',
  tagline: null,
  category: null,
  destination: null,
  destinationSlug: null,
  region: null,
  nights: 4,
  days: 5,
  priceFrom: null,
  currency: 'AED',
  priceStatus: 'on_request',
  heroImage: null,
  images: [],
  overview: [],
  highlights: [],
  includes: [],
  excludes: [],
  itinerary: [],
  hotelName: null,
  boardBasis: null,
  whoFor: [],
  whyWorks: [],
  seasonalNotes: null,
  extensions: [],
  rounds: null,
  roundsNote: null,
  courses: [],
  handicap: null,
  buggies: null,
  caddies: null,
  nonGolfer: null,
  clubCarriage: null,
  teeTimeStatus: null,
  ...over,
});

const day = (n: number) => ({ label: `Day ${n}`, title: `Day ${n}`, description: 'x' });
const course = (h: string) => ({ heading: h, body: 'x' });

describe('pagesForPackage', () => {
  it('gives a bare package only its introduction', () => {
    expect(pagesForPackage(pkg())).toEqual(['packageIntro']);
  });

  it('adds a page only for what the package actually has', () => {
    expect(pagesForPackage(pkg({ courses: [course('Old Course')] }))).toEqual([
      'packageIntro',
      'packageCourses',
    ]);
    expect(pagesForPackage(pkg({ itinerary: [day(1)] }))).toEqual(['packageIntro', 'packageItinerary']);
    expect(pagesForPackage(pkg({ whoFor: ['Golfers'] }))).toEqual(['packageIntro', 'packageWhy']);
  });

  it('puts a full package in reading order', () => {
    const full = pkg({ courses: [course('A')], itinerary: [day(1)], whyWorks: ['Because'] });
    expect(pagesForPackage(full)).toEqual([
      'packageIntro',
      'packageCourses',
      'packageItinerary',
      'packageWhy',
    ]);
  });
});

describe('planPages', () => {
  it('opens with a cover and closes with the contact page', () => {
    const plan = planPages([pkg({ id: 1 }), pkg({ id: 2 })]);
    expect(plan[0].pageType).toBe('cover');
    expect(plan[1].pageType).toBe('contents');
    expect(plan[plan.length - 1].pageType).toBe('contact');
  });

  it('numbers the pages in order, with no gaps', () => {
    const plan = planPages([pkg({ id: 1, itinerary: [day(1)] }), pkg({ id: 2 })]);
    expect(plan.map((p) => p.sortOrder)).toEqual(plan.map((_, i) => i));
  });

  it('leaves out the contents when there is nothing to list', () => {
    const plan = planPages([]);
    expect(plan.map((p) => p.pageType)).toEqual(['cover', 'contact']);
  });

  it('attaches every package page to its package, and no standard page to any', () => {
    const plan = planPages([pkg({ id: 7, courses: [course('A')] })]);
    const attached = plan.filter((p) => p.packageId !== null);
    expect(attached.map((p) => p.packageId)).toEqual([7, 7]);
    expect(plan.filter((p) => p.pageType === 'cover')[0].packageId).toBeNull();
  });
});

describe('checkPackages', () => {
  it('says nothing about a complete package', () => {
    const complete = pkg({
      heroImage: 'x.jpg',
      overview: ['An introduction'],
      highlights: ['One'],
      itinerary: [day(1)],
      courses: [course('A')],
      whyWorks: ['Because'],
      destination: 'Scotland',
    });
    expect(checkPackages([complete])).toEqual([]);
  });

  it('names what is missing rather than just failing', () => {
    const [w] = checkPackages([pkg({ title: 'Bare' })]);
    expect(w.title).toBe('Bare');
    expect(w.issues).toContain('no photography');
    expect(w.issues).toContain('no day-by-day');
    expect(w.issues).toContain('no destination, so it cannot be grouped');
  });
});

/* ──────────────────────────── ordering ──────────────────────────── */

const spread = (id: number, region: string | null, destination: string | null, title = `T${id}`): PackageSpread => ({
  packageId: id,
  pkg: pkg({ id, region, destination, title }),
  content: {},
  images: [],
});

describe('orderByRegion', () => {
  it('leads with Europe and the Middle East, then the rest alphabetically', () => {
    const out = orderByRegion([
      spread(1, 'North America', 'United States'),
      spread(2, 'Africa', 'South Africa'),
      spread(3, 'Europe', 'Spain'),
      spread(4, 'Middle East', 'Oman'),
      spread(5, 'Asia', 'Thailand'),
    ]);
    expect(out.map((s) => s.pkg!.region)).toEqual([
      'Europe',
      'Middle East',
      'Africa',
      'Asia',
      'North America',
    ]);
  });

  it('puts the destinations of a region in alphabetical order', () => {
    const out = orderByRegion([
      spread(1, 'Europe', 'Spain'),
      spread(2, 'Europe', 'Ireland'),
      spread(3, 'Europe', 'Portugal'),
    ]);
    expect(out.map((s) => s.pkg!.destination)).toEqual(['Ireland', 'Portugal', 'Spain']);
  });

  it('keeps journeys sharing a destination in a stable, alphabetical order', () => {
    const out = orderByRegion([
      spread(1, 'Europe', 'Scotland', 'Turnberry and Troon'),
      spread(2, 'Europe', 'Scotland', 'Ayrshire links'),
    ]);
    expect(out.map((s) => s.pkg!.title)).toEqual(['Ayrshire links', 'Turnberry and Troon']);
  });

  it('sends a journey with no region to the end without dropping it', () => {
    const out = orderByRegion([spread(1, null, 'Nowhere'), spread(2, 'Europe', 'Spain')]);
    expect(out.map((s) => s.packageId)).toEqual([2, 1]);
  });

  it('does not mutate the array it was given', () => {
    const input = [spread(1, 'Asia', 'Japan'), spread(2, 'Europe', 'Spain')];
    orderByRegion(input);
    expect(input.map((s) => s.packageId)).toEqual([1, 2]);
  });
});

describe('groupSpreads', () => {
  it('labels each group with its region', () => {
    const groups = groupSpreads(
      orderByRegion([spread(1, 'Asia', 'Japan'), spread(2, 'Europe', 'Spain'), spread(3, 'Europe', 'Italy')]),
      'region',
    );
    expect(groups.map((g) => g.label)).toEqual(['Europe', 'Asia']);
    expect(groups[0].spreads.map((s) => s.pkg!.destination)).toEqual(['Italy', 'Spain']);
  });

  it('does not group a collection that is all one region', () => {
    const groups = groupSpreads([spread(1, 'Europe', 'Spain'), spread(2, 'Europe', 'Italy')], 'region');
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('');
  });

  it('collects the unfiled under one honest heading, at the end', () => {
    const groups = groupSpreads(
      [spread(1, 'Europe', 'Spain'), spread(2, null, null), spread(3, 'Asia', 'Japan')],
      'region',
    );
    expect(groups[groups.length - 1].label).toBe('More journeys');
  });
});

describe('paginateContents', () => {
  const group = (label: string, n: number) => ({
    label,
    spreads: Array.from({ length: n }, (_, i) => spread(i + 1, label, 'X')),
  });

  it('keeps a short collection on one page', () => {
    expect(paginateContents([group('Europe', 6)])).toHaveLength(1);
  });

  it('splits a region too long for a sheet, repeating its heading', () => {
    const pages = paginateContents([group('Europe', 30)]);
    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) expect(page[0].label).toBe('Europe');
  });

  it('loses no journey when it splits', () => {
    const pages = paginateContents([group('Europe', 30), group('Asia', 7)]);
    const total = pages.flat().reduce((a, g) => a + g.spreads.length, 0);
    expect(total).toBe(37);
  });

  it('always returns at least one page, even with nothing to list', () => {
    expect(paginateContents([])).toEqual([[]]);
  });
});

describe('introSummary', () => {
  it('leaves a short introduction alone', () => {
    const s = 'Four Fife links rounds and an honest run at the Old Course ballot.';
    expect(introSummary([s])).toBe(s);
  });

  it('cuts at a sentence, never mid-thought', () => {
    const long =
      'St Andrews is the round every golfer owes themselves. ' +
      'The town rewards doing it properly, with five nights a few minutes from the links. ' +
      'Four rounds are confirmed before you travel, and the ballot is a bonus rather than the plan.';
    const out = introSummary([long], 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith('.')).toBe(true);
    expect(long.startsWith(out)).toBe(true);
  });

  it('copes with nothing', () => {
    expect(introSummary([])).toBe('');
  });
});

/* ────────────────────── reordering the stored pages ────────────────────── */

describe('reorderPages', () => {
  // A brochure of two journeys: cover, contents, two pages each, closing.
  const rows = [
    { id: 1, sort_order: 0, page_type: 'cover', package_id: null },
    { id: 2, sort_order: 1, page_type: 'contents', package_id: null },
    { id: 3, sort_order: 2, page_type: 'packageIntro', package_id: 10 },
    { id: 4, sort_order: 3, page_type: 'packageItinerary', package_id: 10 },
    { id: 5, sort_order: 4, page_type: 'packageIntro', package_id: 20 },
    { id: 6, sort_order: 5, page_type: 'packageWhy', package_id: 20 },
    { id: 7, sort_order: 6, page_type: 'contact', package_id: null },
  ];

  it('reads the journeys in the order they appear', () => {
    expect(packageOrderOf(rows)).toEqual([10, 20]);
  });

  it('keeps the closing page last when a journey moves past it', () => {
    const out = reorderPages(rows, [20, 10]);
    expect(out[out.length - 1].page_type).toBe('contact');
    expect(out[0].page_type).toBe('cover');
    expect(out[1].page_type).toBe('contents');
  });

  it('moves a journey with its whole run of pages', () => {
    const out = reorderPages(rows, [20, 10]);
    expect(out.map((r) => r.id)).toEqual([1, 2, 5, 6, 3, 4, 7]);
  });

  it('keeps a journey\u2019s own pages in their stored order', () => {
    const out = reorderPages(rows, [10, 20]);
    const ten = out.filter((r) => r.package_id === 10).map((r) => r.page_type);
    expect(ten).toEqual(['packageIntro', 'packageItinerary']);
  });

  it('loses nothing, even a journey the caller forgot to name', () => {
    const out = reorderPages(rows, [20]);
    expect(out).toHaveLength(rows.length);
    expect(out.map((r) => r.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // The forgotten journey still travels ahead of the closing page.
    expect(out[out.length - 1].page_type).toBe('contact');
  });

  it('treats a call-to-action as a closing page too', () => {
    const withCta = rows.map((r) => (r.page_type === 'contact' ? { ...r, page_type: 'callToAction' } : r));
    const out = reorderPages(withCta, [20, 10]);
    expect(out[out.length - 1].page_type).toBe('callToAction');
  });
});

describe('movePackageInOrder', () => {
  it('swaps with its neighbour', () => {
    expect(movePackageInOrder([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(movePackageInOrder([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
  });

  it('does nothing at the ends, and says so by returning the same array', () => {
    const order = [1, 2, 3];
    expect(movePackageInOrder(order, 1, -1)).toBe(order);
    expect(movePackageInOrder(order, 3, 1)).toBe(order);
    expect(movePackageInOrder(order, 99, 1)).toBe(order);
  });

  it('does not mutate the order it was given', () => {
    const order = [1, 2, 3];
    movePackageInOrder(order, 2, 1);
    expect(order).toEqual([1, 2, 3]);
  });
});
