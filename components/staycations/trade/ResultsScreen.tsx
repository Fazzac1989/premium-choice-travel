'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/staycations/coastal/Icon';
import ResultRow from './ResultRow';
import { pollStaySearch } from '@/lib/staycations/search-actions';
import { datesLabel, staySearchQuery, type StayResult, type StayResultsPage, type StaySearch } from '@/lib/staycations/stay-search';

/**
 * The live results, as the trade portal shows them (founder, 2026-10-03): a filter column on a
 * wide screen, the sort and a count above the list, row cards, and more hotels arriving while
 * the slower suppliers answer. Sorting and filtering re-read the same search; nothing is asked
 * of the suppliers twice.
 */

const BOARDS: { code: string | null; label: string }[] = [
  { code: null, label: 'Any' },
  { code: 'RO', label: 'Room only' },
  { code: 'BB', label: 'Bed and breakfast' },
  { code: 'HB', label: 'Half board' },
  { code: 'FB', label: 'Full board' },
  { code: 'AI', label: 'All inclusive' },
];
const STARS: { value: number | null; label: string }[] = [
  { value: null, label: 'Any' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 5, label: '5' },
];

type View = { sort: StaySearch['sort']; refundable: boolean; board: string | null; minStars: number | null };

export default function ResultsScreen({
  base,
  search,
  initial,
}: {
  base: string;
  search: StaySearch;
  initial: StayResultsPage;
}) {
  const [page, setPage] = useState(initial);
  const [results, setResults] = useState<StayResult[]>(initial.results);
  const [view, setView] = useState<View>({
    sort: search.sort,
    refundable: search.refundable,
    board: search.board,
    minStars: search.minStars,
  });
  const [busy, setBusy] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const started = useRef(Date.now());
  const dates = search.checkIn ? datesLabel(search.checkIn, search.nights) : null;

  // keep reading while suppliers are still answering (at most a minute)
  useEffect(() => {
    if (!page.pending || !page.sessionId) return;
    if (Date.now() - started.current > 60_000) return;
    const t = setTimeout(async () => {
      const next = await pollStaySearch(page.sessionId, { ...view, offset: 0 });
      if (next.problem) {
        setPage({ ...page, pending: false });
        return;
      }
      setPage(next);
      setResults((shown) => (shown.length > next.results.length ? [...next.results, ...shown.slice(next.results.length)] : next.results));
    }, 1500);
    return () => clearTimeout(t);
  }, [page, view]);

  const change = useCallback(
    async (patch: Partial<View>) => {
      const next = { ...view, ...patch };
      setView(next);
      setBusy(true);
      window.history.replaceState(null, '', `${base}/hotels${staySearchQuery({ ...search, ...next })}`);
      const fresh = await pollStaySearch(page.sessionId, { ...next, offset: 0 });
      setPage(fresh);
      setResults(fresh.results);
      setBusy(false);
    },
    [view, base, search, page.sessionId],
  );

  const more = async () => {
    if (page.nextOffset === null) return;
    setBusy(true);
    const next = await pollStaySearch(page.sessionId, { ...view, offset: page.nextOffset });
    setPage({ ...next, results: [...results, ...next.results] });
    setResults((r) => [...r, ...next.results.filter((x) => !r.some((y) => y.platformHotelId === x.platformHotelId))]);
    setBusy(false);
  };

  const active = (view.refundable ? 1 : 0) + (view.board ? 1 : 0) + (view.minStars ? 1 : 0);
  const query = staySearchQuery({ checkIn: search.checkIn, nights: search.nights, adults: search.adults, childAges: search.childAges });

  const filters = (
    <div className="cc-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="cc-h4 text-[17px]">Filters</h2>
        {active > 0 && (
          <button type="button" onClick={() => change({ refundable: false, board: null, minStars: null })} className="text-[14px] font-semibold text-petrol underline underline-offset-4">
            Clear all ({active})
          </button>
        )}
      </div>
      <label className="mt-4 flex cursor-pointer items-center gap-3 text-[15px] text-sea-ink">
        <input type="checkbox" checked={view.refundable} onChange={(e) => change({ refundable: e.target.checked })} className="h-5 w-5 accent-petrol" />
        Free cancellation
      </label>
      <fieldset className="mt-5">
        <legend className="cc-label">Board</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {BOARDS.map((b) => (
            <button
              key={b.label}
              type="button"
              aria-pressed={view.board === b.code}
              onClick={() => change({ board: b.code })}
              className={`cc-chip !min-h-[38px] !px-3 text-[14px] ${view.board === b.code ? 'cc-chip-on' : ''}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="cc-label">Stars</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {STARS.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={view.minStars === s.value}
              onClick={() => change({ minStars: s.value })}
              className={`cc-chip !min-h-[38px] !px-3 text-[14px] ${view.minStars === s.value ? 'cc-chip-on' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-sea-ink" aria-live="polite">
          {page.pending && results.length === 0 ? (
            'Looking for rooms…'
          ) : (
            <>
              We found <strong>{page.total || results.length}</strong> stay{(page.total || results.length) === 1 ? '' : 's'}
              {page.pending ? ' so far · more are on their way' : ''}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="stay-sort">
            Sort by
          </label>
          <select
            id="stay-sort"
            value={view.sort}
            onChange={(e) => change({ sort: e.target.value as View['sort'] })}
            className="cc-chip !min-h-[44px] !rounded-full pe-8"
          >
            <option value="best">Best match</option>
            <option value="price">Lowest price</option>
            <option value="stars">Star rating</option>
          </select>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className={`cc-chip !min-h-[44px] !rounded-full xl:hidden ${active ? 'cc-chip-on' : ''}`}
          >
            <Icon name="filters" size={18} />
            Filters{active ? ` (${active})` : ''}
          </button>
        </div>
      </div>

      {filtersOpen && <div className="mt-3 xl:hidden">{filters}</div>}

      <div className="mt-4 grid gap-6 xl:grid-cols-[18rem_1fr]">
        <aside className="hidden xl:block">
          <div className="sticky top-24">{filters}</div>
        </aside>

        <div className={busy ? 'opacity-60 transition-opacity' : ''}>
          {page.problem && <p className="rounded-[10px] bg-err-bg px-4 py-3 text-[14px] text-err-ink">{page.problem}</p>}

          {!page.problem && results.length === 0 && !page.pending && (
            <div className="rounded-[12px] border border-sea-line p-8 text-center">
              <h2 className="cc-h4">{active ? 'No stays match these filters.' : 'Nothing is available for these dates.'}</h2>
              <p className="cc-body mx-auto mt-2 max-w-md text-sea-soft">
                {active ? 'Clear a filter to see more.' : 'Try other dates or another emirate, or ask us and we will find it.'}
              </p>
            </div>
          )}

          <ol className="space-y-4">
            {results.map((r, i) => (
              <li key={r.platformHotelId}>
                <ResultRow
                  priority={i < 2}
                  m={{
                    key: r.platformHotelId,
                    href: `${base}/hotels/${r.slug}${query}`,
                    name: r.name,
                    area: r.city,
                    stars: r.stars,
                    image: r.image,
                    specialistPick: r.curated,
                    rate: r.best,
                    dates,
                    guide: null,
                    moreRooms: Math.max(0, r.roomCount - 1),
                  }}
                />
              </li>
            ))}
            {page.pending &&
              Array.from({ length: results.length ? 2 : 6 }, (_, i) => (
                <li key={`wait-${i}`} aria-hidden="true" className="cc-card flex h-[220px] animate-pulse flex-col md:flex-row">
                  <div className="h-40 bg-mist md:h-auto md:w-[288px]" />
                  <div className="flex-1 space-y-3 p-5">
                    <div className="h-5 w-2/3 rounded bg-mist" />
                    <div className="h-4 w-1/3 rounded bg-mist" />
                    <div className="h-4 w-1/2 rounded bg-mist" />
                  </div>
                </li>
              ))}
          </ol>

          {!page.pending && page.nextOffset !== null && (
            <div className="mt-6 text-center">
              <button type="button" onClick={more} disabled={busy} className="cc-btn-quiet !rounded-full !px-6">
                Show more stays
              </button>
            </div>
          )}

          {results.length > 0 && (
            <p className="cc-support mt-6">
              Totals are for the whole stay and include taxes. The price is checked again before you pay. The
              tourism dirham fee, and any similar charge, is paid to the hotel on arrival.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
