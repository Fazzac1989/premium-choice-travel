import { describe, expect, it } from 'vitest';
import { pick } from '@/lib/holidays/deals';
import type { PlatformCard, PlatformOffer } from '@/lib/platform/client';

const offer = (aed: number, mode: PlatformOffer['availabilityMode'] = 'freesale'): PlatformOffer =>
  ({
    offerId: `o${aed}`,
    roomName: 'A room',
    board: 'RO',
    refundable: true,
    refundDeadline: null,
    availabilityMode: mode,
    price: { total: { amount: aed * 100, currency: 'AED' }, perNight: { amount: aed * 25, currency: 'AED' } },
    priceLockExpiresAt: '',
  }) as PlatformOffer;

const card = (name: string, stars: string | null, best: PlatformOffer, alts: PlatformOffer[] = []): PlatformCard =>
  ({
    hotelId: name,
    name,
    city: 'Somewhere',
    countryCode: 'XX',
    starRating: stars,
    description: null,
    latitude: null,
    longitude: null,
    image: null,
    best,
    alternatives: alts,
  }) as PlatformCard;

describe('which hotel reaches the front page', () => {
  it('prefers a four-star over a cheaper guesthouse', () => {
    const guesthouse = card('Guesthouse', '2', offer(354));
    const resort = card('Resort', '5', offer(900));
    expect(pick([guesthouse, resort])?.card.name).toBe('Resort');
  });

  it('takes the cheapest among those good enough', () => {
    const dear = card('Dear', '5', offer(1200));
    const fair = card('Fair', '4', offer(800));
    const cheapBad = card('Hostel', '1', offer(100));
    expect(pick([dear, fair, cheapBad])?.card.name).toBe('Fair');
  });

  it('looks at alternatives, not only the lead room', () => {
    const a = card('A', '5', offer(1000), [offer(600)]);
    expect(pick([a])?.offer.price.total.amount).toBe(60000);
  });

  it('falls back to anything when nothing is rated', () => {
    const one = card('Unrated', null, offer(500));
    const two = card('Also unrated', '3', offer(400));
    expect(pick([one, two])?.card.name).toBe('Also unrated');
  });

  it('never offers a room that cannot be confirmed on payment', () => {
    const onRequest = card('On request', '5', offer(200, 'on_request'));
    const confirmable = card('Confirmable', '5', offer(700));
    expect(pick([onRequest, confirmable])?.card.name).toBe('Confirmable');
  });

  it('is null when there is nothing bookable at all', () => {
    expect(pick([])).toBeNull();
    expect(pick([card('Only on request', '5', offer(200, 'on_request'))])).toBeNull();
  });
});
