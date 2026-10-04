import { describe, expect, it } from 'vitest';
import { GOLF_JOURNEYS } from '@/lib/journeys/golf';
import { GOLF_JOURNEYS_2 } from '@/lib/journeys/golf2';
import type { Package } from '@/lib/types';
import {
  GOLF_TRIP_TYPES,
  filterGolf,
  golfBoards,
  golfFacts,
  golfGeography,
  parseGolfCriteria,
  stripAccessNote,
} from '@/lib/golf/catalogue';

const seeds = [...GOLF_JOURNEYS, ...GOLF_JOURNEYS_2];

function asPackage(s: (typeof seeds)[number], over: Partial<Package> = {}): Package {
  return {
    id: 0,
    slug: s.slug,
    title: s.title,
    tagline: s.tagline,
    destinationSlug: s.destinationSlug,
    destinationName: s.destinationSlug,
    region: '',
    brand: 'golf',
    category: s.category,
    nights: s.nights,
    days: s.days,
    priceFrom: null,
    currency: 'AED',
    heroImage: '',
    gallery: [],
    overview: s.overview,
    highlights: s.highlights,
    includes: s.includes,
    excludes: s.excludes,
    itinerary: s.itinerary,
    hotelName: s.hotelName ?? null,
    boardBasis: s.boardBasis ?? null,
    featured: false,
    status: 'published',
    tags: s.tags,
    whoFor: s.whoFor,
    whyWorks: s.whyWorks,
    seasonalNotes: s.seasonalNotes,
    extensions: s.extensions,
    details: s.details ?? {},
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    priceStatus: 'on_request',
    ...over,
  } as Package;
}

const all = seeds.map((s) => asPackage(s));
const bySlug = (slug: string) => all.find((p) => p.slug === slug)!;

describe('golf taxonomy', () => {
  it('gives every authored journey a known country and region', () => {
    for (const p of all) {
      const f = golfFacts(p);
      expect(f.country, p.slug).not.toBe(p.destinationSlug);
    }
  });

  it('names Northern Ireland, England and Jamaica rather than their coarse destination rows', () => {
    expect(golfFacts(bySlug('northern-ireland-links')).country).toBe('Northern Ireland');
    expect(golfFacts(bySlug('belfry-ryder-cup-resort-break')).country).toBe('England');
    expect(golfFacts(bySlug('jamaica-montego-bay-golf')).country).toBe('Jamaica');
    expect(golfFacts(bySlug('jamaica-montego-bay-golf')).region).toBe('Americas & Caribbean');
  });

  it('folds every category spelling into one trip-type list', () => {
    const keys = new Set(GOLF_TRIP_TYPES.map((t) => t.key));
    for (const p of all) expect(keys.has(golfFacts(p).tripType), p.slug).toBe(true);
    expect(golfFacts(bySlug('langkawi-golf-island-escape')).tripTypeLabel).toBe('Golf & beach');
    expect(golfFacts(bySlug('mauritius-golf-and-beach')).tripTypeLabel).toBe('Golf & beach');
  });

  it('never badges the Scottish links tour as Adventure, whatever the row says', () => {
    const legacy = asPackage(seeds.find((s) => s.slug === 'scotland-links-classic')!, { category: 'Adventure' });
    expect(golfFacts(legacy).tripTypeLabel).toBe('Links golf');
  });

  it('reads board options from the authored wording', () => {
    expect(golfBoards('Breakfast or half board')).toEqual(['half-board', 'breakfast']);
    expect(golfBoards('Dinner, bed and breakfast')).toEqual(['half-board']);
    expect(golfBoards('All-inclusive')).toEqual(['all-inclusive']);
  });

  it('says no flight is needed in the UAE and flights are quoted otherwise', () => {
    expect(golfFacts(bySlug('dubai-championship-collection')).flights).toBe('Not needed');
    expect(golfFacts(bySlug('muscat-al-mouj-golf-break')).flights).toBe('Drive, or quoted');
    expect(golfFacts(bySlug('belek-golf-week')).flights).toBe('Quoted separately');
  });
});

describe('golf filters', () => {
  const run = (q: Record<string, string>) => filterGolf(all, parseGolfCriteria(q)).map((p) => p.slug);

  it('returns everything with no filters', () => {
    expect(run({})).toHaveLength(all.length);
  });

  it('finds a trip by course name, accents optional', () => {
    expect(run({ q: 'carya' })).toContain('belek-golf-week');
    expect(run({ q: 'turkiye' })).toEqual(expect.arrayContaining(['belek-golf-week', 'belek-unlimited-golf']));
  });

  it('combines length, rounds and board', () => {
    const r = run({ length: 'short', board: 'breakfast' });
    expect(r).toContain('dubai-championship-collection');
    expect(r).not.toContain('belek-golf-week');
    expect(run({ rounds: '5' })).toEqual(expect.arrayContaining(['hanoi-hoi-an-golf-tour', 'costa-brava-camiral-golf']));
  });

  it('filters by region and country from the one tree', () => {
    expect(run({ region: 'UK & Ireland' })).toHaveLength(5);
    expect(run({ country: 'northern-ireland' })).toEqual(['northern-ireland-links']);
  });

  it('uses destination seasonality for the month filter, and keeps trips with none on file', () => {
    const scot = { best: [5, 6, 7, 8, 9], good: [4, 10], possible: [] };
    const r = filterGolf(all, parseGolfCriteria({ month: '1' }), { scotland: scot });
    expect(r.map((p) => p.slug)).not.toContain('scotland-links-classic');
    expect(r.map((p) => p.slug)).toContain('belek-golf-week');
  });

  it('only lets approved prices through a budget', () => {
    const priced = [
      asPackage(seeds[0], { priceFrom: 3000, priceStatus: 'approved' }),
      asPackage(seeds[1], { priceFrom: 2000, priceStatus: 'on_request' }),
    ];
    expect(filterGolf(priced, parseGolfCriteria({ budget: '5000' })).map((p) => p.slug)).toEqual([seeds[0].slug]);
  });

  it('groups countries under regions', () => {
    const geo = golfGeography(all);
    expect(geo[0].region).toBe('UAE & Oman');
    expect(geo.flatMap((g) => g.countries).reduce((n, c) => n + c.count, 0)).toBe(all.length);
  });
});

describe('access wording', () => {
  it('removes every authored variant of the access note', () => {
    for (const s of seeds) {
      const texts = [
        ...s.itinerary.map((d) => d.description),
        ...((s.details?.courses as { body: string }[] | undefined) ?? []).map((c) => c.body),
      ];
      for (const t of texts) expect(stripAccessNote(t)).not.toMatch(/unverified/i);
    }
  });

  it('keeps the rest of the sentence', () => {
    expect(stripAccessNote('Day 2 — sandy heathland. Access unverified — confirmed at booking.')).toBe(
      'Day 2 — sandy heathland.',
    );
  });
});
