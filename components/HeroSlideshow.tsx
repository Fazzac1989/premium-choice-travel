'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

export type HeroSlide = {
  src: string;
  alt: string;
  /** CSS object-position, for photographs whose subject is off-centre. */
  position?: string;
};

/** The master site's own set. A brand passes its own through `slides`. */
const SLIDES: HeroSlide[] = [
  {
    src: '/images/hero/hero-1.jpg',
    alt: 'Overwater villas curving across a turquoise lagoon under a peach sunset',
  },
  {
    src: '/images/hero/hero-2.jpg',
    alt: 'Wooden jetty leading to a palm-fringed island at dusk',
  },
  {
    src: '/images/hero/hero-3.jpg',
    alt: 'Tokyo skyline and Tokyo Tower with Mount Fuji behind at sunset',
  },
  {
    src: '/images/hero/hero-4.jpg',
    alt: 'Giraffes among acacia trees on safari under a blue sky',
  },
];

const HOLD_MS = 8000;

/** Full-bleed hero slideshow: slow crossfade, 8 seconds per image. */
export default function HeroSlideshow({ slides = SLIDES }: { slides?: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Respect reduced-motion: hold on the first image.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPaused(true);
      return;
    }
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), HOLD_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {slides.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={i === 0 ? slide.alt : ''}
          fill
          priority={i === 0}
          sizes="100vw"
          style={slide.position ? { objectPosition: slide.position } : undefined}
          className={`object-cover transition-opacity duration-[1500ms] ease-in-out ${
            (paused ? i === 0 : i === active) ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  );
}
