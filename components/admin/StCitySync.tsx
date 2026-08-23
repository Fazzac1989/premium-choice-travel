'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { syncStCities } from '@/lib/admin/st-destination-actions';

/**
 * Cities are derived from the catalogue rather than typed in, so publishing a
 * trip in a new city is the only thing needed to earn that city a page — this
 * button is what notices.
 */
export default function StCitySync({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    const res = await syncStCities();
    setBusy(false);
    if (!res.ok) return setMessage(res.error);
    setMessage(
      res.added ? `${res.added} new city page${res.added === 1 ? '' : 's'} created.` : 'Every city already has a page.'
    );
    router.refresh();
  }

  return (
    <div className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-4">
      <p className="text-sm text-ink-soft">
        {count} city page{count === 1 ? '' : 's'}. New cities appear as their first trip is published.
      </p>
      <button type="button" onClick={run} disabled={busy} className="btn-outline !px-4 !py-2 text-xs disabled:opacity-60">
        {busy ? 'Checking…' : 'Refresh from trips'}
      </button>
      {message && <span className="w-full text-xs font-semibold text-teal-deep">{message}</span>}
    </div>
  );
}
