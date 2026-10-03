import 'server-only';
import type { Hotel } from '@/lib/types';
import type { HotelCardModel } from '@/components/staycations/HotelCard';
import { hotelSlug } from '@/lib/data';
import { priceBand } from '@/lib/price-bands';

/** Resolve a directory hotel into what a card shows — photo choice included. */
export function toHotelCard(h: Hotel): HotelCardModel {
  // the platform's photograph (see getHotels), then anything hand-picked, then the branded panel
  const photo = h.image || h.gallery[0] || null;
  return {
    slug: hotelSlug(h.name),
    name: h.name,
    emirate: h.emirate ?? '',
    area: h.area ?? '',
    stars: h.stars ?? null,
    style: h.style ?? '',
    mealPlans: h.mealPlans,
    priceBandLabel: priceBand(h.priceBand)?.label ?? null,
    featured: Boolean(h.featured),
    photo,
  };
}
