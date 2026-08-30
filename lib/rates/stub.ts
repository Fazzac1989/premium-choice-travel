import type { RateProvider, RateQuery, RateQuote } from './types';

/**
 * A sample provider, for seeing the pricing flow before a bed bank is
 * connected. Off unless RATES_STUB=1 is set.
 *
 * Everything it returns is invented, so anything it prices is labelled "sample
 * price" in the interface — loudly, and not as a footnote. It exists to prove
 * the plumbing and to let the design be judged, never to put a number in front
 * of a customer.
 */
export const stub: RateProvider = {
  name: 'sample',

  configured() {
    return process.env.RATES_STUB === '1';
  },

  async quote(query: RateQuery): Promise<RateQuote | null> {
    // Weekends cost more than midweek, which is the one thing a sample should
    // get right if it is going to be looked at.
    const day = new Date(`${query.checkIn}T00:00:00Z`).getUTCDay();
    const weekendLift = day === 5 || day === 6 ? 1.25 : 1;
    const perNight = Math.round((600 + (query.hotelId % 7) * 220) * weekendLift);

    return {
      amount: perNight * query.nights,
      currency: 'AED',
      nights: query.nights,
      board: 'Bed & breakfast',
      roomName: 'Sample room category',
      provider: 'sample',
    };
  },
};
