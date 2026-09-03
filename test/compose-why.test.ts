import { describe, expect, it } from 'vitest';
import { normaliseWhy } from '@/lib/brochure/compose';

describe('normaliseWhy', () => {
  it('trims, keeps five values and drops empty ones', () => {
    const out = normaliseWhy({
      whyCountry: '  Iceland sits on the divide between two plates. ',
      pctView: ' We rate it. ',
      ageGroup: ' Years 9–11 ',
      educationalValues: [
        { title: ' Fieldwork ', detail: ' Real volcanoes. ' },
        { title: '', detail: '' },
        { title: 'Two', detail: 'x' },
        { title: 'Three', detail: 'x' },
        { title: 'Four', detail: 'x' },
        { title: 'Five', detail: 'x' },
        { title: 'Six', detail: 'never printed' },
      ],
    });
    expect(out.whyCountry).toBe('Iceland sits on the divide between two plates.');
    expect(out.pctView).toBe('We rate it.');
    expect(out.ageGroup).toBe('Years 9–11');
    expect(out.educationalValues).toHaveLength(5);
    expect(out.educationalValues![0]).toEqual({ title: 'Fieldwork', detail: 'Real volcanoes.' });
    expect(out.educationalValues!.map((v) => v.title)).not.toContain('Six');
  });

  it('never carries a price: that is typed by a person', () => {
    const out = normaliseWhy({ whyCountry: 'x', pctView: 'y', ageGroup: '', educationalValues: [], priceRange: 'AED 9,000' } as any);
    expect('priceRange' in out).toBe(false);
  });

  it('survives a malformed reply', () => {
    expect(normaliseWhy(null)).toEqual({ whyCountry: '', pctView: '', ageGroup: '', educationalValues: [] });
    expect(normaliseWhy({ educationalValues: 'nope' })).toEqual({ whyCountry: '', pctView: '', ageGroup: '', educationalValues: [] });
  });
});
