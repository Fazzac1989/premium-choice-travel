import { describe, expect, it } from 'vitest';
import {
  EMPTY_HOLIDAY_CRITERIA,
  airportLabel,
  holidayQuery,
  isAirport,
  isSearchable,
  nightsLabel,
  parseHolidayCriteria,
  partySummary,
  returnDateOf,
  type HolidayCriteria,
} from '@/lib/holidays/search-criteria';

const criteria = (over: Partial<HolidayCriteria> = {}): HolidayCriteria => ({
  ...EMPTY_HOLIDAY_CRITERIA,
  destination: 'Maldives',
  departDate: '2027-03-20',
  ...over,
});

describe('departure airports', () => {
  it('accepts the airports a UAE resident flies from', () => {
    for (const code of ['DXB', 'AUH', 'SHJ', 'DWC', 'RKT']) expect(isAirport(code)).toBe(true);
  });

  it('rejects an airport we do not depart from', () => {
    expect(isAirport('LHR')).toBe(false);
    expect(isAirport('')).toBe(false);
  });

  it('labels an airport by its city, because that is how people say it', () => {
    expect(airportLabel('DXB')).toBe('Dubai (DXB)');
    expect(airportLabel('RKT')).toBe('Ras Al Khaimah (RKT)');
  });
});

describe('parsing a search from the URL', () => {
  it('falls back to Dubai when the airport is missing or unknown', () => {
    expect(parseHolidayCriteria({}).origin).toBe('DXB');
    expect(parseHolidayCriteria({ from: 'LHR' }).origin).toBe('DXB');
  });

  it('takes a lowercase airport code', () => {
    expect(parseHolidayCriteria({ from: 'auh' }).origin).toBe('AUH');
  });

  it('drops a date that is not a date', () => {
    expect(parseHolidayCriteria({ depart: 'next tuesday' }).departDate).toBe('');
    expect(parseHolidayCriteria({ depart: '2027-02-31' }).departDate).toBe('');
    expect(parseHolidayCriteria({ depart: '2027-03-20' }).departDate).toBe('2027-03-20');
  });

  it('clamps a party nobody could book', () => {
    expect(parseHolidayCriteria({ adults: '999' }).adults).toBe(9);
    expect(parseHolidayCriteria({ adults: '0' }).adults).toBe(1);
    expect(parseHolidayCriteria({ nights: '400' }).nights).toBe(28);
    expect(parseHolidayCriteria({ rooms: '10' }).rooms).toBe(4);
  });

  it('keeps one age per child and no more', () => {
    expect(parseHolidayCriteria({ children: '2', ages: '4,9' }).childrenAges).toEqual([4, 9]);
    // More ages than children: the child count wins.
    expect(parseHolidayCriteria({ children: '1', ages: '4,9,11' }).childrenAges).toEqual([4]);
    // A child older than a child is capped, not dropped.
    expect(parseHolidayCriteria({ children: '1', ages: '40' }).childrenAges).toEqual([17]);
  });

  it('ignores a sort it does not know', () => {
    expect(parseHolidayCriteria({ sort: 'cheapest' }).sort).toBe('best');
    expect(parseHolidayCriteria({ sort: 'price' }).sort).toBe('price');
  });
});

describe('the URL round-trip', () => {
  it('survives being written out and read back', () => {
    const before = criteria({
      origin: 'AUH',
      destination: 'Tbilisi',
      nights: 9,
      adults: 3,
      childrenAges: [4, 11],
      rooms: 2,
      sort: 'price',
      stars: '4',
    });
    const after = parseHolidayCriteria(
      Object.fromEntries(new URLSearchParams(holidayQuery(before)).entries()),
    );
    expect(after).toEqual(before);
  });

  it('leaves out what is already the default, so the URL stays readable', () => {
    const q = holidayQuery(criteria());
    expect(q).not.toContain('sort=');
    expect(q).not.toContain('rooms=');
    expect(q).toContain('from=DXB');
    expect(q).toContain('to=Maldives');
  });
});

describe('when a search can be priced', () => {
  it('needs somewhere to go and a day to fly', () => {
    expect(isSearchable(criteria())).toBe(true);
    expect(isSearchable(criteria({ destination: '', cityCode: '' }))).toBe(false);
    expect(isSearchable(criteria({ departDate: '' }))).toBe(false);
  });

  it('is happy with a city code and no typed destination', () => {
    expect(isSearchable(criteria({ destination: '', cityCode: 'MLE' }))).toBe(true);
  });
});

describe('the dates a holiday covers', () => {
  it('flies home after the nights are up', () => {
    expect(returnDateOf(criteria({ departDate: '2027-03-20', nights: 7 }))).toBe('2027-03-27');
  });

  it('crosses a month end', () => {
    expect(returnDateOf(criteria({ departDate: '2027-03-28', nights: 7 }))).toBe('2027-04-04');
  });

  it('has no return date before a departure is chosen', () => {
    expect(returnDateOf(criteria({ departDate: '' }))).toBe('');
  });
});

describe('how the party reads back to the customer', () => {
  it('counts one adult singly', () => {
    expect(partySummary(criteria({ adults: 1 }))).toBe('1 adult');
  });

  it('adds children and rooms only when there are some', () => {
    expect(partySummary(criteria({ adults: 2 }))).toBe('2 adults');
    expect(partySummary(criteria({ adults: 2, childrenAges: [5] }))).toBe('2 adults · 1 child');
    expect(partySummary(criteria({ adults: 4, childrenAges: [5, 8], rooms: 2 }))).toBe(
      '4 adults · 2 children · 2 rooms',
    );
  });

  it('says night and nights', () => {
    expect(nightsLabel(1)).toBe('1 night');
    expect(nightsLabel(7)).toBe('7 nights');
  });
});

describe('narrowing the results', () => {
  it('carries a refundable-only filter through the URL', () => {
    const before = criteria({ refundable: true, board: 'HB', stars: '4', sort: 'price' });
    const after = parseHolidayCriteria(
      Object.fromEntries(new URLSearchParams(holidayQuery(before)).entries()),
    );
    expect(after.refundable).toBe(true);
    expect(after.board).toBe('HB');
    expect(after.stars).toBe('4');
    expect(after.sort).toBe('price');
  });

  it('leaves refundable out of the URL when it is off', () => {
    expect(holidayQuery(criteria({ refundable: false }))).not.toContain('refundable');
  });

  it('treats anything but 1 as not filtering', () => {
    expect(parseHolidayCriteria({ refundable: 'true' }).refundable).toBe(false);
    expect(parseHolidayCriteria({ refundable: '0' }).refundable).toBe(false);
    expect(parseHolidayCriteria({ refundable: '1' }).refundable).toBe(true);
  });
});

describe('the filters sent to the platform', () => {
  it('sends nothing when the customer has narrowed nothing', async () => {
    const { filtersOf } = await import('@/lib/holidays/holiday-search');
    expect(filtersOf(criteria())).toEqual({});
  });

  it('sends only what was chosen', async () => {
    const { filtersOf } = await import('@/lib/holidays/holiday-search');
    expect(filtersOf(criteria({ stars: '4' }))).toEqual({ minStars: 4 });
    expect(filtersOf(criteria({ board: 'AI' }))).toEqual({ board: ['AI'] });
    expect(filtersOf(criteria({ refundable: true }))).toEqual({ refundable: true });
  });

  it('sends them together', async () => {
    const { filtersOf } = await import('@/lib/holidays/holiday-search');
    expect(filtersOf(criteria({ stars: '5', board: 'BB', refundable: true }))).toEqual({
      refundable: true,
      board: ['BB'],
      minStars: 5,
    });
  });
});
