'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const SLIDES: { src: string; alt: string }[] = [
  {
    src: '/images/hero.jpg',
    alt: 'White sand beach with leaning palm trees over turquoise water',
  },
  {
    src: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2400&auto=format&fit=crop',
    alt: 'Red torii gates of Fushimi Inari shrine, Japan',
  },
  {
    src: 'https://images.unsplash.com/photo-1548574505-5e239809ee19?q=80&w=2400&auto=format&fit=crop',
    alt: 'Cruise ship sailing a deep blue sea',
  },
  {
    src: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2400&auto=format&fit=crop',
    alt: 'Dubai skyline at dusk',
  },
];

const HOLD_MS = 3000;

/** Full-bleed hero slideshow: 4 images, slow crossfade, 3 seconds per image. */
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
