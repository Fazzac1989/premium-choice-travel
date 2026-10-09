import type { HeroSlide } from '@/components/HeroSlideshow';

/**
 * The Holidays hero photographs (founder's own brand assets, 2026-10-09).
 *
 * Separate from the master site's set, which this brand used to borrow. The
 * originals run 7–27 MB; what ships here is each one at 2400px and roughly a
 * third of a megabyte, which is the same weight as the images it replaces.
 *
 * `position` exists because the hero is full-bleed and `object-cover` crops
 * from the centre: on a phone a landscape photograph loses most of its width,
 * so anything with a subject off to one side says where to hold on.
 */
export const HOLIDAYS_HERO: HeroSlide[] = [
  {
    src: '/images/hero/holidays/hero-3.jpg',
    alt: 'Clear turquoise shallows and a palm-lined white sand beach at sunset',
    position: '70% center',
  },
  {
    src: '/images/hero/holidays/hero-1.jpg',
    alt: 'A family walking barefoot along the shoreline as the sun goes down',
    position: '30% center',
  },
  {
    src: '/images/hero/holidays/hero-2.jpg',
    alt: 'A couple at an infinity pool watching the sun set over the sea',
    position: '55% center',
  },
  {
    src: '/images/hero/holidays/hero-5.jpg',
    alt: 'A couple on a lodge deck looking out over open green hills',
    position: '60% center',
  },
  {
    src: '/images/hero/holidays/hero-6.jpg',
    alt: 'A herd of elephants crossing open grassland on safari',
    // 35% put a single bull's head across the whole phone screen.
    position: '72% center',
  },
  {
    src: '/images/hero/holidays/hero-4.jpg',
    alt: 'A traveller with arms outstretched on a wide volcanic beach',
    position: '62% center',
  },
];
