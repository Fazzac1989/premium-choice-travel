'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import HotelCard, { type HotelCardModel } from '@/components/staycations/HotelCard';
import { readSavedHotels, subscribeSavedHotels } from '@/lib/pwa/saved-hotels';

export default function SavedHotelsList({ base }: { base: string }) {
  const [slugs, setSlugs] = useState<string[] | null>(null);
  const [hotels, setHotels] = useState<HotelCardModel[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sync = () => setSlugs(readSavedHotels());
    sync();
    return subscribeSavedHotels(sync);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/staycations/hotels')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (!cancelled) setHotels(j.hotels ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (slugs === null) return null;

  if (slugs.length === 0) {
    return (
      <div className="rounded-2xl border border-line p-10 text-center">
        <p className="font-serif text-2xl text-ink">Nothing saved yet.</p>
        <p className="mt-3 text-ink-soft">Tap the heart on any hotel and it will wait for you here.</p>
        <Link href={`${base}/hotels`} className="btn-primary mt-6">Browse the hotels</Link>
      </div>
    );
  }

  if (failed && !hotels) {
    return (
      <div className="rounded-2xl border border-line p-10 text-center">
        <p className="font-serif text-2xl text-ink">Your shortlist needs a connection.</p>
        <p className="mt-3 text-ink-soft">
          {slugs.length} hotel{slugs.length === 1 ? ' is' : 's are'} saved — they will show as soon as you are back online.
        </p>
      </div>
    );
  }

  if (!hotels) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {slugs.slice(0, 6).map((s) => (
          <div key={s} className="card aspect-[4/5] animate-pulse bg-sand" />
        ))}
      </div>
    );
  }

  const bySlug = new Map(hotels.map((h) => [h.slug, h]));
  const list = slugs.map((s) => bySlug.get(s)).filter((h): h is HotelCardModel => Boolean(h));

  return (
    <>
      <p className="text-xs text-ink-soft">
        {list.length} saved hotel{list.length === 1 ? '' : 's'} · kept on this device
      </p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((h) => (
          <HotelCard key={h.slug} hotel={h} base={base} />
        ))}
      </div>
    </>
  );
}
