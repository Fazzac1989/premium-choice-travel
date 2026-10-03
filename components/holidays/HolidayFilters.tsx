'use client';

/**
 * Narrowing a search that is already running.
 *
 * Changing a filter re-reads the same search session rather than starting a new
 * one: the platform has already asked its suppliers, and asking them again
 * because somebody ticked "half board" would cost money and time for an answer
 * it already holds. So these do not navigate — they re-read and rewrite the
 * address bar, which keeps the result shareable and the back button honest.
 */

export type FilterValues = {
  sort: string;
  stars: string;
  board: string;
  refundable: boolean;
};

const SORTS = [
  { value: 'best', label: 'Our pick' },
  { value: 'price', label: 'Lowest price' },
  { value: 'stars', label: 'Star rating' },
];

const STARS = [
  { value: '', label: 'Any rating' },
  { value: '3', label: '3 star and up' },
  { value: '4', label: '4 star and up' },
  { value: '5', label: '5 star only' },
];

const BOARDS = [
  { value: '', label: 'Any board' },
  { value: 'RO', label: 'Room only' },
  { value: 'BB', label: 'Bed and breakfast' },
  { value: 'HB', label: 'Half board' },
  { value: 'FB', label: 'Full board' },
  { value: 'AI', label: 'All inclusive' },
];

export default function HolidayFilters({
  value,
  onChange,
  busy,
  resultCount,
}: {
  value: FilterValues;
  onChange: (next: FilterValues) => void;
  busy: boolean;
  resultCount: number;
}) {
  const set = <K extends keyof FilterValues>(key: K, v: FilterValues[K]) =>
    onChange({ ...value, [key]: v });

  const select =
    'rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-teal-deep disabled:opacity-50';

  const narrowed = Boolean(value.stars || value.board || value.refundable);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2.5 border-b border-line pb-5">
      <label className="sr-only" htmlFor="holiday-sort">
        Sort by
      </label>
      <select
        id="holiday-sort"
        value={value.sort}
        disabled={busy}
        onChange={(e) => set('sort', e.target.value)}
        className={select}
      >
        {SORTS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="holiday-stars">
        Star rating
      </label>
      <select
        id="holiday-stars"
        value={value.stars}
        disabled={busy}
        onChange={(e) => set('stars', e.target.value)}
        className={select}
      >
        {STARS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="holiday-board">
        Board
      </label>
      <select
        id="holiday-board"
        value={value.board}
        disabled={busy}
        onChange={(e) => set('board', e.target.value)}
        className={select}
      >
        {BOARDS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={busy}
        aria-pressed={value.refundable}
        onClick={() => set('refundable', !value.refundable)}
        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
          value.refundable
            ? 'border-teal-deep bg-teal-deep text-white'
            : 'border-line bg-white text-ink hover:border-teal-deep'
        }`}
      >
        Free cancellation
      </button>

      {narrowed ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onChange({ ...value, stars: '', board: '', refundable: false })}
          className="px-1 text-sm font-semibold text-ink-soft underline-offset-4 hover:text-teal-deep hover:underline disabled:opacity-50"
        >
          Clear
        </button>
      ) : null}

      <span className="ml-auto text-sm text-ink-soft" aria-live="polite">
        {busy ? 'Updating…' : `${resultCount} shown`}
      </span>
    </div>
  );
}
