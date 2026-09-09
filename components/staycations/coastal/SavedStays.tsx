'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import StayCard from './StayCard';
import { readSavedHotels, subscribeSavedHotels } from '@/lib/pwa/saved-hotels';
import type { StayCardModel } from '@/lib/staycations/stay-card';

/**
 * The shortlist, kept on the device.
 *
 * The hotels themselves are fetched fresh every time it opens, so a saved
 * stay that has since been withdrawn or renamed shows as it is now rather
 * than as it was when it was saved.
 */
export default function SavedStays({ base, searchQuery }: { base: string; searchQuery: string }) {
  const [slugs, setSlugs] = useState<string[] | null>(null);
  const [stays, setStays] = useState<StayCardModel[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sync = () => setSlugs(readSavedHotels());
    sync();
    return subscribeSavedHotels(sync);
  }, []);

  useEffect(() => {
    let live = true;
    fetch('/api/staycations/hotels')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => live && setStays(j.hotels ?? []))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  if (slugs === null) return null;

  if (slugs.length === 0) {
    return (
      <div className="rounded-[12px] border border-sea-line p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mist text-petrol">
          <Icon name="heart" size={24} />
        </span>
        <h2 className="cc-h4 mt-3">Nothing saved yet</h2>
        <p className="cc-body mx-auto mt-2 max-w-sm text-sea-soft">
          Tap the heart on any stay and it waits for you here, on this device.
        </p>
        <Link href={`${base}/hotels${searchQuery}`} className="cc-btn-primary mt-5">
          Browse stays
        </Link>
      </div>
    );
  }

  if (failed && !stays) {
    return (
      <div className="rounded-[12px] border border-sea-line p-8 text-center">
        <h2 className="cc-h4">Your shortlist needs a connection</h2>
        <p className="cc-body mt-2 text-sea-soft">
          {slugs.length} stay{slugs.length === 1 ? '' : 's'} saved. They appear as soon as you are back online.
        </p>
      </div>
    );
  }

  if (!stays) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        {slugs.slice(0, 6).map((s) => (
          <li key={s} className="h-[340px] animate-pulse rounded-[12px] bg-mist" />
        ))}
      </ul>
    );
  }

  const bySlug = new Map(stays.map((s) => [s.slug, s]));
  const list = slugs
    .map((s) => bySlug.get(s))
    .filter((s): s is StayCardModel => Boolean(s))
    .map((s) => ({ ...s, href: `${base}/hotels/${s.slug}${searchQuery}` }));

  return (
    <>
      <p className="cc-support">
        {list.length} saved stay{list.length === 1 ? '' : 's'} · kept on this device
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((stay) => (
          <li key={stay.slug} className="min-w-0">
            <StayCard stay={stay} basis="" />
          </li>
        ))}
      </ul>
      {list.length < slugs.length && (
        <p className="cc-support mt-4">
          {slugs.length - list.length} saved stay{slugs.length - list.length === 1 ? ' is' : 's are'} no longer in the
          directory.
        </p>
      )}
    </>
  );
}
