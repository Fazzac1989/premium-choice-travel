import { describe, expect, it } from 'vitest';
import { GOLF_BRIEFS } from '@/lib/golf/briefs';
import { RELATES_TO, briefCourses, briefDestinationSlug, briefRow, briefSlug } from '@/lib/golf/brief-rows';
import { GOLF_JOURNEYS } from '@/lib/journeys/golf';
import { GOLF_JOURNEYS_2 } from '@/lib/journeys/golf2';
import { golfPlace } from '@/lib/golf/catalogue';

const liveSlugs = new Set([...GOLF_JOURNEYS, ...GOLF_JOURNEYS_2].map((j) => j.slug));

describe('golf sourcing briefs', () => {
  it('has all 40 briefs, P01 to P40', () => {
    expect(GOLF_BRIEFS.map((b) => b.id)).toEqual(Array.from({ length: 40 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`));
  });

  it('gives every brief its own slug, none clashing with an authored journey', () => {
    const slugs = GOLF_BRIEFS.map(briefSlug);
    expect(new Set(slugs).size).toBe(40);
    for (const s of slugs) expect(liveSlugs.has(s), s).toBe(false);
  });

  it('knows the destination of every brief', () => {
    for (const b of GOLF_BRIEFS) expect(briefDestinationSlug(b), b.destination).not.toBeNull();
  });

  it('only relates briefs to journeys that exist', () => {
    const known = new Set([...Array.from(liveSlugs), ...GOLF_BRIEFS.map(briefSlug)]);
    for (const [id, slug] of Object.entries(RELATES_TO)) expect(known.has(slug), `${id} → ${slug}`).toBe(true);
  });

  it('always makes a draft with no price', () => {
    for (const b of GOLF_BRIEFS) {
      const row = briefRow(b, 1);
      expect(row.status).toBe('draft');
      expect(row.price_status).toBe('on_request');
      expect(row).not.toHaveProperty('price_from');
      expect(row.review_note).toContain(`SOURCING BRIEF ${b.id}`);
      expect(row.review_note).toContain(b.before);
    }
  });

  it('splits courses and their rounds', () => {
    const p02 = GOLF_BRIEFS.find((b) => b.id === 'P02')!;
    expect(briefCourses(p02)).toEqual([
      { heading: 'Yas Links', body: '1 round to request.' },
      { heading: 'Abu Dhabi National', body: '1 round to request.' },
    ]);
  });

  it('files the Northern Ireland brief under Northern Ireland, not England', () => {
    const p32 = GOLF_BRIEFS.find((b) => b.id === 'P32')!;
    const row = briefRow(p32, 1);
    const place = golfPlace({ slug: row.slug, destinationSlug: 'united-kingdom', destinationName: 'United Kingdom', details: row.details });
    expect(place.country).toBe('Northern Ireland');
  });
});
