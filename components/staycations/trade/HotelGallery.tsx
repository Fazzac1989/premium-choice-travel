'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Icon from '@/components/staycations/coastal/Icon';

/**
 * The hotel page's photographs, as the trade portal lays them out: one large picture and two
 * beside it on a wide screen, one on a phone, and "All photos" opening the full set.
 */
export default function HotelGallery({ images, name }: { images: string[]; name: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (images.length === 0)
    return (
      <div className="flex h-[220px] items-end rounded-[16px] bg-gradient-to-br from-petrol to-petrol-deep p-6 font-display text-[28px] text-white md:h-[320px]">
        {name}
      </div>
    );

  const [main, ...rest] = images;
  return (
    <>
      <div className="relative grid h-[260px] gap-2 overflow-hidden rounded-[16px] md:h-[440px] md:grid-cols-[2fr_1fr] md:grid-rows-2">
        <button type="button" onClick={() => setOpen(true)} className="relative md:row-span-2" aria-label={`Open the photographs of ${name}`}>
          <Image src={main!} alt={name} fill priority sizes="(min-width: 768px) 66vw, 100vw" className="object-cover" />
        </button>
        {rest.slice(0, 2).map((src, i) => (
          <button key={src} type="button" onClick={() => setOpen(true)} className="relative hidden md:block" aria-label={`Photograph ${i + 2} of ${name}`}>
            <Image src={src} alt="" fill sizes="33vw" className="object-cover" />
          </button>
        ))}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute bottom-3 end-3 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-sea-ink shadow-[0_4px_16px_rgba(22,75,87,0.18)]"
          >
            <Icon name="explore" size={16} />
            All {images.length} photos
          </button>
        )}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Photographs of ${name}`} className="fixed inset-0 z-50 overflow-y-auto bg-white">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sea-line bg-white px-4 py-3">
            <p className="cc-h4 truncate text-[17px]">{name}</p>
            <button type="button" onClick={() => setOpen(false)} className="cc-icon-btn" aria-label="Close the photographs">
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="mx-auto grid max-w-5xl gap-3 p-4 sm:grid-cols-2">
            {images.map((src, i) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-mist">
                <Image src={src} alt={`${name}, photograph ${i + 1}`} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
