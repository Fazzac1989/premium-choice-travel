import { describe, expect, it } from 'vitest';
import { toRateInfo } from '@/lib/staycations/stay-search';

/** What a Staycations customer sees a rate come with (2026-10-06). */
describe('rate information', () => {
  it('keeps the deal, inclusions, notes and pay-at-hotel charges in dirhams', () => {
    expect(
      toRateInfo({
        boardName: 'BED AND BREAKFAST',
        offers: ['Early booking', 'Long stay'],
        inclusions: ['Free WiFi'],
        notes: ['Check-in from 15:00.'],
        payAtHotel: [
          { label: 'Tourism Dirham', amount: 6000, currency: 'AED' },
          { label: 'City tax', amount: 3500, currency: 'KWD' },
        ],
      }),
    ).toEqual({
      deal: 'Early booking',
      inclusions: ['Free WiFi'],
      notes: ['Check-in from 15:00.'],
      payAtHotel: [
        { label: 'Tourism Dirham', amount: 60, currency: 'AED' },
        { label: 'City tax', amount: 3.5, currency: 'KWD' },
      ],
    });
  });

  it('is nothing when the rate says nothing', () => {
    expect(toRateInfo(null)).toBeNull();
    expect(toRateInfo({ boardName: 'ROOM ONLY', offers: [], inclusions: [], notes: [], payAtHotel: [] })).toBeNull();
  });
});
