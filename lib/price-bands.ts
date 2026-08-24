/**
 * Rough price bands for the staycation directory.
 *
 * Deliberately not a rate. The job is to stop someone falling for Burj Al Arab
 * on a Rove budget, and to let people filter the directory by roughly what
 * they want to spend — without quoting a price nobody has confirmed.
 *
 * Every band is per room, per night, two adults, bed & breakfast, outside peak
 * dates. That footnote goes wherever a band is shown; a number without it is a
 * promise we can't keep.
 */

export type PriceBand = {
  /** 1 = cheapest. Stored on hotels.price_band. */
  band: number;
  /** Shown on cards and filters. */
  label: string;
  /** Longer form for the booking panel. */
  long: string;
};

export const PRICE_BANDS: PriceBand[] = [
  { band: 1, label: 'Under AED 700', long: 'Typically under AED 700 a night' },
  { band: 2, label: 'AED 700–1,500', long: 'Typically AED 700–1,500 a night' },
  { band: 3, label: 'AED 1,500–3,000', long: 'Typically AED 1,500–3,000 a night' },
  { band: 4, label: 'AED 3,000+', long: 'Typically AED 3,000 a night and up' },
];

export const PRICE_BASIS = 'Per room per night, two adults, bed & breakfast, outside peak dates — a guide, not a quote.';

export function priceBand(band: number | null | undefined) {
  if (!band) return null;
  return PRICE_BANDS.find((b) => b.band === band) ?? null;
}
