/**
 * The photographs behind Explore.
 *
 * Staycations sells the whole country, so the opening picture should not make
 * the site look like one hotel's booking page. Add images here and one is
 * chosen per page load: a beach, a desert camp, a mountain pool, a marina at
 * dusk. Each needs a wide crop (about 2400×1740 or wider) that still reads
 * with a headline across its lower half.
 *
 * `credit` is for our own records — who supplied it and under what licence —
 * so nobody has to guess later whether an image can stay.
 */

export type HeroImage = {
  src: string;
  /** Empty when the picture is decorative: the headline already says where we are. */
  alt: string;
  credit: string;
};

export const HERO_IMAGES: HeroImage[] = [
  {
    src: '/images/brands/staycations-hero-coastal.jpg',
    alt: '',
    credit: 'Shutterstock 2767411053 — Jumeirah marina at sunset',
  },
];

/**
 * One picture for this render. With a single image it is that image; with
 * several it rotates, so two people opening the site see the range rather
 * than the same property twice.
 */
export function pickHero(seed?: number): HeroImage {
  if (HERO_IMAGES.length === 1) return HERO_IMAGES[0];
  const n = seed ?? Date.now();
  return HERO_IMAGES[Math.abs(Math.floor(n)) % HERO_IMAGES.length];
}
