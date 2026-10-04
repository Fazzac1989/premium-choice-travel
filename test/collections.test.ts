import { describe, expect, it } from 'vitest';
import { belongsIn, collectionBySlug, groupsWithContent, packagesIn } from '@/lib/holidays/collections';
import type { Package } from '@/lib/types';

const pkg = (over: Partial<Package> = {}): Package =>
  ({
    id: 1,
    slug: 'x',
    title: 'A holiday',
    tagline: '',
    brand: 'holidays',
    category: '',
    nights: 7,
    heroImage: '',
    highlights: [],
    boardBasis: null,
    featured: false,
    details: {},
    ...over,
  }) as unknown as Package;

const couples = collectionBySlug('couples')!;
const beach = collectionBySlug('beach-and-islands')!;

describe('how a holiday lands in a collection', () => {
  it('lands there by its own category', () => {
    expect(belongsIn(beach, pkg({ category: 'Beach & islands' }))).toBe(true);
    expect(belongsIn(couples, pkg({ category: 'Beach & islands' }))).toBe(false);
  });

  it('lands there when somebody put it there by hand', () => {
    const p = pkg({ category: 'Beach & islands', details: { collections: ['couples'] } });
    expect(belongsIn(couples, p)).toBe(true);
    // And it keeps the collection its own category earned.
    expect(belongsIn(beach, p)).toBe(true);
  });

  it('is never removed from one by a tag', () => {
    const p = pkg({ category: 'Beach & islands', details: { collections: ['couples'] } });
    expect(belongsIn(beach, p)).toBe(true);
  });

  it('sits in several at once', () => {
    const p = pkg({ details: { collections: ['couples', 'wellness'] } });
    expect(belongsIn(couples, p)).toBe(true);
    expect(belongsIn(collectionBySlug('wellness')!, p)).toBe(true);
  });
});

describe('when details holds something unexpected', () => {
  const cases: { what: string; details: unknown }[] = [
    { what: 'no details at all', details: undefined },
    { what: 'an empty object', details: {} },
    { what: 'collections as a string', details: { collections: 'couples' } },
    { what: 'collections as a number', details: { collections: 42 } },
    { what: 'collections null', details: { collections: null } },
    { what: 'a list with rubbish in it', details: { collections: [null, 7, 'couples'] } },
  ];

  for (const c of cases) {
    it(`does not throw on ${c.what}`, () => {
      const p = pkg({ details: c.details as Package['details'] });
      expect(() => belongsIn(couples, p)).not.toThrow();
    });
  }

  it('still reads the usable entries out of a messy list', () => {
    const p = pkg({ details: { collections: [null, 7, 'couples'] } as unknown as Package['details'] });
    expect(belongsIn(couples, p)).toBe(true);
  });
});

describe('the menu and the page agree', () => {
  it('offers a collection only when something is in it, tags included', () => {
    const tagged = pkg({ id: 2, title: 'Tagged only', details: { collections: ['wellness'] } });
    const groups = groupsWithContent([tagged]);
    const offered = groups.flatMap((g) => g.items).map((c) => c.slug);
    expect(offered).toContain('wellness');
    // And the page for it is not empty, which is the thing that must match.
    expect(packagesIn(collectionBySlug('wellness')!, [tagged])).toHaveLength(1);
  });

  it('does not offer a collection nothing belongs to', () => {
    const plain = pkg({ category: 'Beach & islands' });
    const offered = groupsWithContent([plain]).flatMap((g) => g.items).map((c) => c.slug);
    expect(offered).not.toContain('festive');
  });
});
