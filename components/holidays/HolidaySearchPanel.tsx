'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEPARTURE_AIRPORTS,
  MAX_ADULTS,
  MAX_CHILDREN,
  MAX_CHILD_AGE,
  MAX_ROOMS,
  defaultDepartDate,
  holidayQuery,
  latestDepartDate,
  todayInDubai,
  ymd,
  SEARCH_MODES,
  type AirportCode,
  type HolidayCriteria,
  type SearchMode,
} from '@/lib/holidays/search-criteria';

/**
 * The front door.
 *
 * A UAE resident books a holiday by answering four things in this order: which
 * airport, where to, when, and who is coming. The panel asks them in that order
 * and nothing else, because every extra field on a search costs conversions.
 * Everything finer — board, stars, budget — belongs on the results page, where
 * the customer has something to narrow.
 */

const NIGHT_CHOICES = [3, 4, 5, 6, 7, 10, 11, 14, 21];

type Props = {
  /** Destinations we already write about, offered as the customer types. */
  suggestions?: { name: string; region: string }[];
  /** Pre-fill, when the panel sits above a results page. */
  initial?: Partial<HolidayCriteria>;
  /** The results route, e.g. "/search" — brand sites and the master site differ. */
  action?: string;
  compact?: boolean;
  /**
   * Which tabs to offer. Flights are only sold once the platform can price
   * them, so the caller decides rather than this component guessing — a tab
   * that leads nowhere is worse than one less tab.
   */
  modes?: SearchMode[];
};

export default function HolidaySearchPanel({
  suggestions = [],
  initial,
  action = '/search',
  compact = false,
  modes = ['package', 'hotel'],
}: Props) {
  const router = useRouter();
  const listId = useId();
  const partyRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<SearchMode>(initial?.mode ?? modes[0] ?? 'package');
  const [origin, setOrigin] = useState<AirportCode>(initial?.origin ?? 'DXB');
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [departDate, setDepartDate] = useState(initial?.departDate || defaultDepartDate());
  const [nights, setNights] = useState(initial?.nights ?? 7);
  const [adults, setAdults] = useState(initial?.adults ?? 2);
  const [childrenAges, setChildrenAges] = useState<number[]>(initial?.childrenAges ?? []);
  const [rooms, setRooms] = useState(initial?.rooms ?? 1);
  const [partyOpen, setPartyOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  // The party popover closes on an outside click or Escape, like every other one.
  useEffect(() => {
    if (!partyOpen) return;
    const onDown = (e: MouseEvent) => {
      if (partyRef.current && !partyRef.current.contains(e.target as Node)) setPartyOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPartyOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [partyOpen]);

  const setChildCount = (n: number) => {
    setChildrenAges((prev) => {
      if (n <= prev.length) return prev.slice(0, n);
      // A new child starts with no age chosen; 8 is a sensible middle, and the
      // customer can change it. Suppliers price by age, so it cannot be blank.
      return [...prev, ...Array(n - prev.length).fill(8)];
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setTouched(true);
      return;
    }
    const query = holidayQuery({
      mode,
      origin,
      destination: destination.trim(),
      departDate,
      nights,
      adults,
      childrenAges,
      rooms,
    });
    router.push(`${action}?${query}`);
  };

  const partyLabel = [
    `${adults} ${adults === 1 ? 'adult' : 'adults'}`,
    childrenAges.length ? `${childrenAges.length} ${childrenAges.length === 1 ? 'child' : 'children'}` : '',
    rooms > 1 ? `${rooms} rooms` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const field =
    'w-full overflow-hidden text-ellipsis whitespace-nowrap bg-transparent text-[15px] font-semibold text-ink outline-none';
  const label = 'block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft';
  const cell = 'min-w-0 rounded-xl border border-line bg-white px-4 py-3 focus-within:border-teal-deep';

  // Only the modes this site can actually serve, in the order they are listed.
  const tabs = SEARCH_MODES.filter((m) => modes.includes(m.value));
  const needsOrigin = SEARCH_MODES.find((m) => m.value === mode)?.needsOrigin ?? true;

  return (
    <form
      onSubmit={submit}
      className={`rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-ink/5 backdrop-blur sm:p-4 ${
        compact ? '' : 'sm:rounded-3xl'
      }`}
    >
      {/* What are you buying? Only offered when there is more than one answer. */}
      {tabs.length > 1 && (
        <div role="tablist" aria-label="What to search for" className="mb-3 flex flex-wrap gap-1 px-1">
          {tabs.map((t) => {
            const on = t.value === mode;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setMode(t.value)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  on ? 'bg-teal-deep text-white' : 'text-ink-soft hover:bg-sand hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${
          needsOrigin
            ? 'lg:grid-cols-[1.45fr_1.6fr_1.05fr_0.55fr_1.05fr_auto]'
            : 'lg:grid-cols-[2fr_1.15fr_0.6fr_1.15fr_auto]'
        }`}
      >
        {/* A hotel on its own has no departure airport. */}
        {needsOrigin && (
        <div className={cell}>
          <label className={label} htmlFor={`${listId}-from`}>
            Flying from
          </label>
          <select
            id={`${listId}-from`}
            value={origin}
            onChange={(e) => setOrigin(e.target.value as AirportCode)}
            className={`${field} -ml-0.5 cursor-pointer`}
          >
            {DEPARTURE_AIRPORTS.map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </select>
        </div>
        )}

        <div className={`${cell} ${touched && !destination.trim() ? 'border-danger' : ''}`}>
          <label className={label} htmlFor={`${listId}-to`}>
            {mode === 'hotel' ? 'Where' : 'Where to'}
          </label>
          <input
            id={`${listId}-to`}
            list={listId}
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              if (touched) setTouched(false);
            }}
            placeholder="Country or city"
            autoComplete="off"
            className={`${field} placeholder:font-normal placeholder:text-ink-soft/70`}
          />
          <datalist id={listId}>
            {suggestions.map((s) => (
              <option key={s.name} value={s.name}>
                {s.region}
              </option>
            ))}
          </datalist>
        </div>

        <div className={cell}>
          <label className={label} htmlFor={`${listId}-depart`}>
            {mode === 'hotel' ? 'Check in' : 'Departing'}
          </label>
          <input
            id={`${listId}-depart`}
            type="date"
            value={departDate}
            min={ymd(todayInDubai())}
            max={latestDepartDate()}
            onChange={(e) => setDepartDate(e.target.value)}
            className={`${field} cursor-pointer`}
          />
        </div>

        <div className={cell}>
          <label className={label} htmlFor={`${listId}-nights`}>
            Nights
          </label>
          <select
            id={`${listId}-nights`}
            value={nights}
            onChange={(e) => setNights(Number(e.target.value))}
            className={`${field} -ml-0.5 cursor-pointer`}
          >
            {NIGHT_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className={`${cell} relative`} ref={partyRef}>
          <span className={label}>{mode === 'hotel' ? 'Guests' : 'Travellers'}</span>
          <button
            type="button"
            onClick={() => setPartyOpen((v) => !v)}
            aria-expanded={partyOpen}
            className={`${field} truncate text-left`}
          >
            {partyLabel}
          </button>

          {partyOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-xl border border-line bg-white p-4 shadow-xl sm:left-auto sm:right-0 sm:w-80">
              <Counter label="Adults" hint="16 and over" value={adults} min={1} max={MAX_ADULTS} onChange={setAdults} />
              <Counter
                label="Children"
                hint="Under 16 when you fly"
                value={childrenAges.length}
                min={0}
                max={MAX_CHILDREN}
                onChange={setChildCount}
              />
              {childrenAges.length ? (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="text-[11px] text-ink-soft">
                    Hotels and airlines charge by age, so we need each child&rsquo;s age on the day you fly.
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {childrenAges.map((age, i) => (
                      // Children have no id of their own; position is the identity here.
                      // eslint-disable-next-line react/no-array-index-key
                      <label key={i} className="text-[11px] text-ink-soft">
                        Child {i + 1}
                        <select
                          value={age}
                          onChange={(e) =>
                            setChildrenAges((prev) =>
                              prev.map((a, j) => (j === i ? Number(e.target.value) : a)),
                            )
                          }
                          className="mt-0.5 w-full rounded-lg border border-line px-2 py-1 text-[13px] font-semibold text-ink"
                        >
                          {Array.from({ length: MAX_CHILD_AGE + 1 }, (_, n) => (
                            <option key={n} value={n}>
                              {n === 0 ? 'Under 1' : n}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-3 border-t border-line pt-3">
                <Counter label="Rooms" hint="" value={rooms} min={1} max={MAX_ROOMS} onChange={setRooms} />
              </div>
              <button
                type="button"
                onClick={() => setPartyOpen(false)}
                className="mt-3 w-full rounded-lg bg-ink px-3 py-2 text-[13px] font-semibold text-white"
              >
                Done
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          className="rounded-xl bg-teal-deep px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-teal-hover lg:px-9"
        >
          Search
        </button>
      </div>

      {touched && !destination.trim() ? (
        <p className="mt-2 px-1 text-[13px] font-semibold text-danger">
          Tell us where you would like to go.
        </p>
      ) : null}
    </form>
  );
}

function Counter({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  const btn =
    'h-8 w-8 rounded-full border border-line text-[17px] leading-none text-ink transition-colors hover:border-teal-deep disabled:opacity-35 disabled:hover:border-line';
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span>
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {hint ? <span className="block text-[11px] text-ink-soft">{hint}</span> : null}
      </span>
      <span className="flex items-center gap-2.5">
        <button type="button" onClick={() => step(-1)} disabled={value <= min} className={btn} aria-label={`Fewer ${label.toLowerCase()}`}>
          &minus;
        </button>
        <span className="w-5 text-center text-[14px] font-semibold tabular-nums text-ink">{value}</span>
        <button type="button" onClick={() => step(1)} disabled={value >= max} className={btn} aria-label={`More ${label.toLowerCase()}`}>
          +
        </button>
      </span>
    </div>
  );
}
