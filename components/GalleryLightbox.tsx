'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryImage } from '@/lib/types';

/**
 * Editorial gallery grid with an accessible lightbox: keyboard navigation,
 * swipe on touch, captions, image count, reduced-motion support, lazy grid.
 */
export default function GalleryLightbox({ images, title }: { images: GalleryImage[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const show = images.slice(0, 20);

  const step = useCallback(
    (dir: -1 | 1) => setOpen((i) => (i === null ? null : (i + dir + show.length) % show.length)),
    [show.length]
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, step]);

  if (show.length === 0) return null;

  return (
    <>
      {/* Grid: editorial on desktop, swipeable strip on mobile */}
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {show.map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`Open image ${i + 1} of ${show.length}: ${img.alt}`}
            className={`group relative w-64 shrink-0 snap-start overflow-hidden rounded-xl sm:w-auto ${
              i === 0 ? 'aspect-[4/3] sm:col-span-2 sm:row-span-2 sm:aspect-auto' : 'aspect-[4/3]'
            }`}
          >
            <Image
              src={img.url}
              alt={img.alt}
              fill
              loading={i < 4 ? undefined : 'lazy'}
              sizes="(max-width: 640px) 80vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/15" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} gallery, image ${open + 1} of ${show.length}`}
          className="fixed inset-0 z-[100] flex flex-col bg-ink/95 backdrop-blur"
          onClick={() => setOpen(null)}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 48) step(dx > 0 ? -1 : 1);
            touchX.current = null;
          }}
        >
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm text-white/70">
              {open + 1} / {show.length}
            </span>
            <button
              ref={closeBtn}
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close gallery"
              className="rounded-full p-2 hover:bg-white/10"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
            <Image
              src={show[open].url}
              alt={show[open].alt}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/60 p-3 text-white hover:bg-teal sm:left-6"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/60 p-3 text-white hover:bg-teal sm:right-6"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <p className="p-4 text-center text-sm text-white/80">{show[open].alt}</p>
        </div>
      )}
    </>
  );
}
