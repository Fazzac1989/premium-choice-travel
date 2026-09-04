import { afterEach, describe, expect, it } from 'vitest';
import { hotelbeds, hotelbedsOffersFromHotel } from '@/lib/rates/hotelbeds';

/** A trimmed APItude availability `hotel` object, shaped like the real thing. */
const hotel = {
  code: 12345,
  name: 'Test Palm Resort',
  currency: 'EUR',
  rooms: [
    {
      code: 'DBL.ST',
      name: 'DOUBLE STANDARD',
      rates: [
        {
          rateKey: '20260911|20260913|W|1|12345|DBL.ST|BB|A|1~2~0||N@abc',
          rateClass: 'NOR',
          rateType: 'BOOKABLE',
          net: '200.00',
          allotment: 5,
          paymentType: 'AT_WEB',
          boardCode: 'BB',
          boardName: 'BED AND BREAKFAST',
          cancellationPolicies: [{ amount: '200.00', from: '2026-09-09T22:59:00+02:00' }],
          taxes: { taxes: [{ included: false, amount: '15.00', currency: 'AED', type: 'TAX' }], allIncluded: false },
        },
        {
          rateKey: '20260911|20260913|W|1|12345|DBL.ST|RO|N|1~2~0||N@def',
          rateClass: 'NRF',
          rateType: 'BOOKABLE',
          net: '150.00',
          sellingRate: '190.00',
          paymentType: 'AT_WEB',
          boardName: 'ROOM ONLY',
          cancellationPolicies: [{ amount: '150.00', from: '2026-09-01T00:00:00+02:00' }],
        },
        {
          rateKey: 'dup',
          rateClass: 'NRF',
          net: '150.00',
          sellingRate: '190.00',
          paymentType: 'AT_WEB',
          boardName: 'ROOM ONLY',
        },
      ],
    },
    {
      code: 'SUI',
      name: 'SUITE',
      rates: [{ rateKey: 'pay-later', rateClass: 'NOR', net: '400.00', paymentType: 'AT_HOTEL', boardName: 'HALF BOARD' }],
    },
  ],
};

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe('Hotelbeds offers', () => {
  it('prices net plus the default margin, and prefers a supplier selling rate', () => {
    delete process.env.HOTELBEDS_MARKUP_PERCENT;
    const offers = hotelbedsOffersFromHotel(hotel);
    const bb = offers.find((o) => o.board === 'BED AND BREAKFAST')!;
    expect(bb.total).toBe(224); // 200 + 12%
    expect(bb.net).toBe(200);
    const ro = offers.find((o) => o.board === 'ROOM ONLY')!;
    expect(ro.total).toBe(190); // sellingRate wins over net + margin
    expect(ro.net).toBe(150);
  });

  it('honours HOTELBEDS_MARKUP_PERCENT', () => {
    process.env.HOTELBEDS_MARKUP_PERCENT = '20';
    const bb = hotelbedsOffersFromHotel(hotel).find((o) => o.board === 'BED AND BREAKFAST')!;
    expect(bb.total).toBe(240);
  });

  it('reads cancellation terms from rateClass and the earliest policy date', () => {
    const offers = hotelbedsOffersFromHotel(hotel);
    const bb = offers.find((o) => o.board === 'BED AND BREAKFAST')!;
    expect(bb.refundable).toBe(true);
    expect(bb.cancelBy).toBe('2026-09-09T22:59:00+02:00');
    const ro = offers.find((o) => o.board === 'ROOM ONLY')!;
    expect(ro.refundable).toBe(false);
    expect(ro.cancelBy).toBeNull();
  });

  it('surfaces taxes collected at the hotel and labels pay-at-hotel rooms', () => {
    const offers = hotelbedsOffersFromHotel(hotel);
    const bb = offers.find((o) => o.board === 'BED AND BREAKFAST')!;
    expect(bb.extraFees).toEqual([{ description: 'tax at the hotel', amount: 15, currency: 'AED' }]);
    const suite = offers.find((o) => o.roomName.startsWith('SUITE'))!;
    expect(suite.roomName).toContain('pay at the hotel');
  });

  it('sorts cheapest first, drops duplicates and keeps the rate key as the offer id', () => {
    const offers = hotelbedsOffersFromHotel(hotel);
    expect(offers.map((o) => o.total)).toEqual([190, 224, 448]);
    expect(offers[0].offerId).toContain('|DBL.ST|RO|');
    expect(offers.every((o) => o.currency === 'EUR')).toBe(true);
  });

  it('only owns plain numeric codes', () => {
    expect(hotelbeds.ownsCode!('12345')).toBe(true);
    expect(hotelbeds.ownsCode!('lp42f57')).toBe(false);
  });
});
