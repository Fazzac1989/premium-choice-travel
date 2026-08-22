'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { structureStTrip } from '@/lib/admin/st-itinerary-actions';

/**
 * Shows whether a trip has its scannable day cards, and rebuilds them on
 * demand. Without this the only route to structuring was the importer's
 * automatic pass — and when that failed there was neither a sign nor a retry.
 */
export default function StStructureBanner({
  tripId,
  structuredDays,
  totalDays,
}: {
  tripId: number;
  structuredDays: number;
  totalDays: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (totalDays === 0) return null;
  const complete = structuredDays >= totalDays;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await structureStTrip(tripId);
      if (!res.ok) return setError(res.error);
      if (res.failed) return setError(`${res.failed} day${res.failed === 1 ? '' : 's'} failed — try again.`);
      router.refresh();
    } catch {
      // A killed or timed-out server action rejects with no useful message.
      setError('The rebuild did not complete — the request timed out or was interrupted. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`mt-6 flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${
        complete ? 'border-line bg-white' : 'border-danger/30 bg-danger/5'
      }`}
    >
      <div className="min-w-[200px] flex-1">
        <p className="text-sm font-semibold text-ink">
          {complete
            ? 'Day summaries built'
            : `Day summaries missing — ${structuredDays} of ${totalDays} days`}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {complete
            ? 'The public page shows the journey rail and scannable day cards.'
            : 'The public page is falling back to the old plain-day layout until these are built.'}
        </p>
      </div>
      <button
        type="button"
        className="btn-outline !bg-white !py-2 text-xs"
        disabled={busy}
        onClick={run}
      >
        {busy ? 'Building… (about a minute)' : complete ? 'Rebuild summaries' : 'Build day summaries'}
      </button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
