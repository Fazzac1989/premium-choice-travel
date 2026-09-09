'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import SaveHotelButton from '@/components/staycations/SaveHotelButton';

/**
 * The photographs at the top of a stay.
 *
 * Swipes on a phone, arrows on a laptop, and opens full screen. The counter
 * is the honest one — how many pictures of this property we actually hold.
 */
export default function StayGallery({
  images,
  credits,
  name,
  location,
  slug,
  backHref,
}: {
  images: { url: string; alt: string }[];
  credits: string[];
  name: string;
  location: string;
  slug: string;
  backHref: string;
}) {
  const [index, setIndex] = useState(0);
  const [full, setFull] = useState(false);
  const count = images.length;
  const go = (n: number) => setIndex((i) => (count ? (n + count) % count : 0));

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFull(false);
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full, index, count]);

  const current = images[index];

  return (
    <>
      <div className="relative h-[300px] w-full bg-mist sm:h-[380px] lg:h-[440px] lg:rounded-[12px] lg:overflow-hidden">
        {current ? (
          <button
            type="button"
            onClick={() => setFull(true)}
            aria-label={`Open photograph ${index + 1} of ${count} full screen`}
            className="absolute inset-0"
          >
            <Image src={current.url} alt={current.alt} fill priority sizes="(max-width: 1024px) 100vw, 1200px" className="object-cover" />
          </button>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-petrol to-petrol-deep p-8">
            <p className="text-center font-display text-[26px] leading-[32px] text-white/90">{name}</p>
          </div>
        )}
        <div className="cc-scrim" />

        {/* Controls */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Link href={backHref} aria-label="Back to results" className="cc-icon-btn bg-white/92 text-sea-ink backdrop-blur">
            <Icon name="chevron-left" size={22} />
          </Link>
          <div className="flex items-center gap-2">
            <SaveHotelButton slug={slug} name={name} savedColor="#164B57" className="!bg-white/92 backdrop-blur" />
            <ShareButton name={name} />
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photograph"
              className="cc-icon-btn absolute left-2 top-1/2 hidden -translate-y-1/2 bg-white/85 text-sea-ink backdrop-blur hover:bg-white lg:inline-flex"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photograph"
              className="cc-icon-btn absolute right-2 top-1/2 hidden -translate-y-1/2 bg-white/85 text-sea-ink backdrop-blur hover:bg-white lg:inline-flex"
            >
              <Icon name="chevron-right" size={20} />
            </button>
            <span className="absolute right-3 top-16 rounded-full bg-petrol-deep/70 px-2.5 py-1 text-[12px] font-medium tabular-nums text-white lg:top-3 lg:right-16">
              {index + 1} / {count}
            </span>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4 lg:p-6">
          <h1 className="cc-h3 text-white lg:text-[32px] lg:leading-[38px]">{name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[14px] leading-[20px] text-white/85">
            <Icon name="pin" size={16} />
            {location}
          </p>
        </div>
      </div>

      {/* A row of thumbnails is the quickest way through a small gallery. */}
      {count > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1 lg:px-0" role="tablist" aria-label="Photographs">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photograph ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-[8px] border-2 transition-colors ${
                i === index ? 'border-petrol' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {credits.length > 0 && (
        <p className="cc-support px-4 pt-2 lg:px-0">
          Photography via Google — {credits.slice(0, 4).join(', ')}
          {credits.length > 4 ? ' and others' : ''}.
        </p>
      )}

      {full && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photographs`}
          className="fixed inset-0 z-[70] flex flex-col bg-petrol-deep/95"
        >
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-[14px] tabular-nums">
              {index + 1} / {count}
            </span>
            <button type="button" onClick={() => setFull(false)} aria-label="Close photographs" className="cc-icon-btn bg-white/15">
              <Icon name="close" size={22} />
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={current.url} alt={current.alt} fill sizes="100vw" className="object-contain" />
          </div>
          {count > 1 && (
            <div className="flex items-center justify-center gap-6 p-4">
              <button type="button" onClick={() => go(index - 1)} aria-label="Previous photograph" className="cc-icon-btn bg-white/15 text-white">
                <Icon name="chevron-left" size={22} />
              </button>
              <button type="button" onClick={() => go(index + 1)} aria-label="Next photograph" className="cc-icon-btn bg-white/15 text-white">
                <Icon name="chevron-right" size={22} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ShareButton({ name }: { name: string }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = typeof window === 'undefined' ? '' : window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }
    } catch {
      // Cancelled, or the browser refused — nothing to report.
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label={done ? 'Link copied' : `Share ${name}`}
      className="cc-icon-btn bg-white/92 text-sea-ink backdrop-blur"
    >
      <Icon name={done ? 'check' : 'share'} size={20} />
    </button>
  );
}
