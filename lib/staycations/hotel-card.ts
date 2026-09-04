import 'server-only';
import type { Hotel } from '@/lib/types';
import type { HotelCardModel } from '@/components/staycations/HotelCard';
import { hotelSlug } from '@/lib/data';
import { hotelPhotoSrc } from '@/lib/images/google-places';
import { priceBand } from '@/lib/price-bands';

/** Resolve a directory hotel into what a card shows — photo choice included. */
export function toHotelCard(h: Hotel): HotelCardModel {
  // The first Google photo we can actually serve (cached, or live if that is
  // on), then anything hand-picked, then the branded panel.
  const photo = (h.photos ?? []).map((p) => hotelPhotoSrc(p, 800)).find(Boolean) || h.image || h.gallery[0] || null;
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
