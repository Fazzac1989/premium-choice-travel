import { describe, expect, it } from 'vitest';
import { convertAmount, convertOffer } from '@/lib/rates/fx';
import type { RoomOffer } from '@/lib/rates/types';

// Units per US dollar, as the live table is shaped. AED is the peg.
const rates = { USD: 1, AED: 3.6725, EUR: 0.92, GBP: 0.79 };

const offer: RoomOffer = {
  offerId: 'x',
  roomName: 'Deluxe',
  board: 'ROOM ONLY',
  refundable: false,
  cancelBy: null,
  total: 1000,
  net: 869.57,
  currency: 'EUR',
  extraFees: [
    { description: 'tax', amount: 40, currency: 'AED' },
    { description: 'resort fee', amount: 10, currency: 'USD' },
  ],
};

describe('currency conversion', () => {
  it('converts through the dollar peg', () => {
    expect(convertAmount(100, 'USD', 'AED', rates)).toBe(367.25);
    expect(convertAmount(92, 'EUR', 'USD', rates)).toBe(100);
    expect(convertAmount(1000, 'EUR', 'AED', rates)).toBe(3991.85);
  });

  it('refuses a currency it does not know', () => {
    expect(convertAmount(1, 'XYZ', 'AED', rates)).toBeNull();
  });

  it('converts an offer, including fees in other currencies, and leaves dirham fees alone', () => {
    const aed = convertOffer(offer, rates, 'AED');
    expect(aed.currency).toBe('AED');
    expect(aed.total).toBe(3991.85);
    expect(aed.net).toBe(3471.19);
    expect(aed.extraFees).toEqual([
      { description: 'tax', amount: 40, currency: 'AED' },
      { description: 'resort fee', amount: 36.73, currency: 'AED' },
    ]);
  });

  it('is a no-op for an offer already in the display currency', () => {
    const same = convertOffer({ ...offer, currency: 'AED', extraFees: [] }, rates, 'AED');
    expect(same.total).toBe(1000);
    expect(same.net).toBe(869.57);
  });

  it('keeps the original currency when no rate exists', () => {
    const kept = convertOffer({ ...offer, currency: 'XYZ' }, rates, 'AED');
    expect(kept.currency).toBe('XYZ');
    expect(kept.total).toBe(1000);
  });
});
