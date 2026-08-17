'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const SLIDES: { src: string; alt: string }[] = [
  {
    src: '/images/hero/hero-1.jpg',
    alt: 'Wooden jetty leading to a palm-fringed island over turquoise water',
  },
  {
    src: '/images/hero/hero-2.jpg',
    alt: 'Boardwalk winding to overwater villas under a fiery sunset sky',
  },
  {
    src: '/images/hero/hero-3.jpg',
    alt: 'Overwater villas and a curving jetty at dusk',
  },
  {
    src: '/images/hero/hero-4.jpg',
    alt: 'Boat crossing a lagoon at sunset, palm trees on the horizon',
  },
];

const HOLD_MS = 8000;

/** Full-bleed hero slideshow: 4 images, slow crossfade, 8 seconds per image. */
export default function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Respect reduced-motion: hold on the first image.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPaused(true);
      return;
    }
    const id = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), HOLD_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {SLIDES.map((slide, i) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={i === 0 ? slide.alt : ''}
          fill
          priority={i === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-[1500ms] ease-in-out ${
            (paused ? i === 0 : i === active) ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  );
}
