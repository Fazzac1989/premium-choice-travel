'use client';

import { useEffect, useRef, useState } from 'react';
import HolidayResultCard from './HolidayResultCard';
import { pollHolidaySearch } from '@/lib/holidays/search-actions';
import type { HolidaySearchPage } from '@/lib/holidays/holiday-search';
import {
  airportLabel,
  nightsLabel,
  partySummary,
  tripDatesLabel,
  type HolidayCriteria,
} from '@/lib/holidays/search-criteria';

/**
 * The results, while they are still arriving.
 *
 * The platform answers a search before its suppliers do, so the first page is
 * usually empty and `pending` is true. Rendering that once and stopping would
 * tell a customer there is nothing available at the very moment the search
 * started — so this keeps asking until the platform says it has finished.
 */

/** How often to ask again, and how long before we stop asking. */
const EVERY_MS = 1_000;
const GIVE_UP_MS = 25_000;

export default function HolidayResults({
  initial,
  criteria,
  params,
}: {
  initial: HolidaySearchPage;
  criteria: HolidayCriteria;
  params: Record<string, string>;
}) {
  const [page, setPage] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const [settled, setSettled] = useState(!initial.pending);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (settled) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (!live) return;
      if (Date.now() - startedAt.current > GIVE_UP_MS) {
        setSettled(true);
        return;
      }
      const res = await pollHolidaySearch(page.sessionId, params);
      if (!live) return;
      if (!res.ok) {
        setProblem(res.message);
        setSettled(true);
        return;
      }
      setPage(res.page);
      if (res.page.pending) timer = setTimeout(tick, EVERY_MS);
      else setSettled(true);
    };

    timer = setTimeout(tick, EVERY_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // The session is what identifies this search; params only ever change by navigation.
  }, [page.sessionId, params, settled, page.pending]);

  const searching = !settled;
  const nothingYet = page.results.length === 0;

  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">
          {page.destinationLabel || criteria.destination}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {nightsLabel(page.nights)} &middot; {tripDatesLabel(criteria)} &middot; {partySummary(criteria)}{' '}
          &middot; from {airportLabel(criteria.origin)}
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
          {searching ? (
            <>
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-line border-t-teal-deep"
              />
              Searching our suppliers{page.total > 0 ? ` — ${page.total} so far` : ''}…
            </>
          ) : page.total > 0 ? (
            `${page.total} ${page.total === 1 ? 'hotel' : 'hotels'} available`
          ) : (
            'No hotels available for these dates'
          )}
        </p>
      </header>

      {!page.flights.available && (page.results.length > 0 || searching) ? (
        <div className="mb-6 rounded-xl border-l-4 border-teal-deep bg-teal/5 px-5 py-4">
          <p className="text-sm font-semibold text-ink">Prices below are for the hotel only</p>
          <p className="mt-1 text-sm text-ink-soft">
            {page.flights.note} Tell us which hotel you like and we will price the flights from{' '}
            {airportLabel(criteria.origin)} with it.
          </p>
        </div>
      ) : null}

      {problem ? (
        <div className="mb-6 rounded-xl border border-line bg-white px-5 py-4">
          <p className="text-sm text-ink">{problem}</p>
        </div>
      ) : null}

      {nothingYet ? (
        searching ? (
          <ul className="grid gap-4" aria-hidden>
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-44 animate-pulse rounded-2xl border border-line bg-sand/60" />
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
            <h2 className="font-serif text-2xl text-ink">Nothing available for these dates</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              Try a different week, a nearby airport, or a shorter stay.
            </p>
          </div>
        )
      ) : (
        <ul className="grid gap-4">
          {page.results.map((r) => (
            <li key={r.platformHotelId}>
              <HolidayResultCard result={r} travellers={page.travellers} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
