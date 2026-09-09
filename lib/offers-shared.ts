/**
 * Offers: the parts the browser may hold.
 *
 * Types, the brand list and the pure helpers live here with no server
 * imports, so the admin form and the public card can use them; the
 * database read is in lib/offers.ts.
 *
 * An offer belongs to one brand or to all of them. School Trips and
 * Corporate never show offers, so those are not brands an offer can have.
 */

export const OFFER_BRANDS = ['all', 'holidays', 'staycations', 'cruises', 'golf'] as const;
export type OfferBrand = (typeof OFFER_BRANDS)[number];

export const OFFER_BRAND_LABELS: Record<OfferBrand, string> = {
  all: 'Every brand',
  holidays: 'Holidays',
  staycations: 'Staycations',
  cruises: 'Cruises',
  golf: 'Golf Holidays',
};

/** The brand sites that show offers. */
export const OFFER_SITES = ['holidays', 'staycations', 'cruises', 'golf'] as const;

export type Offer = {
  id: number;
  brand: OfferBrand;
  title: string;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  badge: string | null;
  priceFrom: number | null;
  currency: string;
  priceNote: string | null;
  validFrom: string | null;
  validUntil: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  status: 'draft' | 'published';
  sortOrder: number;
};

export function mapOffer(row: any): Offer {
  return {
    id: row.id,
    brand: (OFFER_BRANDS as readonly string[]).includes(row.brand) ? row.brand : 'all',
    title: row.title ?? '',
    subtitle: row.subtitle ?? null,
    description: row.description ?? null,
    image: row.image ?? null,
    badge: row.badge ?? null,
    priceFrom: row.price_from == null ? null : Number(row.price_from),
    currency: row.currency ?? 'AED',
    priceNote: row.price_note ?? null,
    validFrom: row.valid_from ?? null,
    validUntil: row.valid_until ?? null,
    ctaLabel: row.cta_label ?? null,
    ctaHref: row.cta_href ?? null,
    status: row.status === 'published' ? 'published' : 'draft',
    sortOrder: row.sort_order ?? 0,
  };
}

/**
 * Whether an offer is live today: published, started if it has a start, and
 * not yet past its end. Dates are compared as calendar days.
 */
export function isLive(offer: Offer, today = new Date().toISOString().slice(0, 10)): boolean {
  if (offer.status !== 'published') return false;
  if (offer.validFrom && offer.validFrom > today) return false;
  if (offer.validUntil && offer.validUntil < today) return false;
  return true;
}

/** The offers a brand site shows: its own and the ones for every brand, live today. */
export function offersForSite(all: Offer[], site: string, today?: string): Offer[] {
  return all
    .filter((o) => isLive(o, today) && (o.brand === 'all' || o.brand === site))
    .sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
}

/** "Until 30 November" — the date as a person would say it. */
export function untilLabel(offer: Offer): string | null {
  if (!offer.validUntil) return null;
  const d = new Date(`${offer.validUntil}T00:00:00`);
  return `Until ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
}

export function priceLabel(offer: Offer): string | null {
  if (offer.priceFrom == null) return null;
  return `From ${offer.currency} ${offer.priceFrom.toLocaleString('en-GB')}`;
}
