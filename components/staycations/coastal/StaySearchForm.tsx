'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import Icon from './Icon';
import { EMIRATES } from '@/lib/staycations/filters';
import {
  MAX_ADULTS,
  MAX_CHILDREN,
  MAX_CHILD_AGE,
  MAX_NIGHTS,
  MAX_ROOMS,
  addDays,
  criteriaQuery,
  dateRangeLabel,
  defaultCheckIn,
  guestSummary,
  todayInDubai,
  ymd,
  type SearchCriteria,
} from '@/lib/staycations/search-criteria';

/**
 * Where, when and who — the one search control in the app.
 *
 * The same component is the white panel on Explore and the editor behind the
 * summary on results, so a stay is described in exactly one way wherever it
 * is changed. Each field opens in place rather than in a floating layer:
 * predictable on a phone, and it keeps the keyboard from covering the thing
 * being typed into.
 *
 * A child's age is required, never assumed. Hotels price children by age and
 * some rates refuse them altogether, so a guessed age produces a price we
 * could not honour.
 */

type Field = 'where' | 'dates' | 'guests' | null;

export default function StaySearchForm({
  base,
  initial,
  variant = 'panel',
  onDone,
}: {
  base: string;
  initial: SearchCriteria;
  /** 'panel' is the Explore hero card; 'sheet' is the results editor. */
  variant?: 'panel' | 'sheet';
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const id = useId();
  const [open, setOpen] = useState<Field>(null);

  const [emirate, setEmirate] = useState(initial.emirate);
  const [checkIn, setCheckIn] = useState(initial.checkIn || defaultCheckIn());
  const [checkOut, setCheckOut] = useState(addDays(initial.checkIn || defaultCheckIn(), initial.nights));
  const [adults, setAdults] = useState(initial.adults);
  const [ages, setAges] = useState<(number | '')[]>(initial.childrenAges.map((a) => (a >= 0 ? a : '')));
  const [rooms, setRooms] = useState(initial.rooms);
  const [error, setError] = useState('');

  const today = ymd(todayInDubai());
  const nights = Math.max(
    1,
    Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86_400_000) || 1,
  );

  const criteria: SearchCriteria = {
    ...initial,
    emirate,
    checkIn,
    nights,
    adults,
    childrenAges: ages.map((a) => (a === '' ? -1 : a)),
    rooms,
  };

  const setCheckInSafe = (value: string) => {
    setCheckIn(value);
    // Keep the stay length rather than the end date when the start moves.
    if (value && (!checkOut || checkOut <= value)) setCheckOut(addDays(value, nights));
  };

  const setChildCount = (count: number) => {
    setAges((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ''));
  };

  const submit = () => {
    setError('');
    if (!checkIn) return setError('Add a check-in date.');
    if (checkIn < today) return setError('Check-in cannot be in the past.');
    if (!checkOut || checkOut <= checkIn) return setError('Check-out must be after check-in.');
    if (nights > MAX_NIGHTS) return setError(`We search up to ${MAX_NIGHTS} nights — send us longer stays and we will price them by hand.`);
    if (ages.some((a) => a === '')) {
      setOpen('guests');
      return setError('Add each child’s age — hotels price children by age.');
    }
    start(() => {
      router.push(`${base}/hotels${criteriaQuery(criteria)}`);
      onDone?.();
    });
  };

  /**
   * `compact` is the half-width pair. They lose the chevron and tighten the
   * gap, because "2 adults · 1 room" has to fit beside a date range on a
   * 360px phone without being cut in half.
   */
  const fieldBtn = (
    name: Exclude<Field, null>,
    label: string,
    value: string,
    icon: 'pin' | 'calendar' | 'guests',
    compact = false,
  ) => (
    <button
      type="button"
      aria-expanded={open === name}
      aria-controls={`${id}-${name}`}
      onClick={() => setOpen(open === name ? null : name)}
      className={`flex min-h-[56px] w-full items-center rounded-[10px] border text-left transition-colors ${
        compact ? 'gap-2 px-2.5' : 'gap-3 px-3.5'
      } ${open === name ? 'border-petrol bg-mist/50' : 'border-sea-line bg-white hover:border-petrol'}`}
    >
      <Icon name={icon} size={compact ? 18 : 20} className="shrink-0 text-petrol" />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] leading-[16px] text-sea-soft">{label}</span>
        <span className={`block truncate font-medium text-sea-ink ${compact ? 'text-[13px] leading-[18px]' : 'text-[15px] leading-[20px]'}`}>
          {value}
        </span>
      </span>
      {!compact && (
        <Icon name={open === name ? 'chevron-down' : 'chevron-right'} size={18} className="shrink-0 text-sea-soft" />
      )}
    </button>
  );

  const stepper = (
    label: string,
    hint: string,
    value: number,
    set: (n: number) => void,
    min: number,
    max: number,
  ) => (
    <div className="flex items-center justify-between gap-4 border-b border-sea-line py-3 last:border-0">
      <div>
        <p className="text-[15px] font-medium text-sea-ink">{label}</p>
        <p className="cc-support">{hint}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => set(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`One fewer ${label.toLowerCase()}`}
          className="cc-icon-btn border border-sea-line text-sea-ink disabled:opacity-40"
        >
          <Icon name="minus" size={18} />
        </button>
        <span className="w-9 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => set(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`One more ${label.toLowerCase()}`}
          className="cc-icon-btn border border-sea-line text-sea-ink disabled:opacity-40"
        >
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className={variant === 'panel' ? 'cc-panel p-4 sm:p-5' : ''}>
      <div className="grid gap-2.5">
        {fieldBtn('where', 'Where', emirate || 'Across the UAE', 'pin')}
        {open === 'where' && (
          <div id={`${id}-where`} className="rounded-[10px] border border-sea-line bg-shell p-2">
            <div className="grid grid-cols-2 gap-2">
              {['', ...EMIRATES].map((e) => (
                <button
                  key={e || 'all'}
                  type="button"
                  onClick={() => {
                    setEmirate(e);
                    setOpen(null);
                  }}
                  className={`min-h-[44px] rounded-[8px] px-3 text-left text-[15px] transition-colors ${
                    emirate === e ? 'bg-petrol text-white' : 'bg-white text-sea-ink hover:bg-mist'
                  }`}
                >
                  {e || 'Across the UAE'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {fieldBtn('dates', 'When', dateRangeLabel({ ...criteria }), 'calendar', true)}
          {fieldBtn('guests', 'Who', guestSummary(criteria), 'guests', true)}
        </div>

        {open === 'dates' && (
          <div id={`${id}-dates`} className="rounded-[10px] border border-sea-line bg-shell p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="cc-label">Check-in</span>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => setCheckInSafe(e.target.value)}
                  className="cc-field mt-1"
                />
              </label>
              <label className="block">
                <span className="cc-label">Check-out</span>
                <input
                  type="date"
                  value={checkOut}
                  min={addDays(checkIn || today, 1)}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="cc-field mt-1"
                />
              </label>
            </div>
            <p className="cc-support mt-2">
              {nights} night{nights === 1 ? '' : 's'} · dates are UAE local time.
            </p>
          </div>
        )}

        {open === 'guests' && (
          <div id={`${id}-guests`} className="rounded-[10px] border border-sea-line bg-shell p-3">
            {stepper('Adults', '18 and over', adults, setAdults, 1, MAX_ADULTS)}
            {stepper('Children', 'Ages 0–17 at check-in', ages.length, setChildCount, 0, MAX_CHILDREN)}
            {ages.length > 0 && (
              <div className="grid gap-2 border-b border-sea-line py-3 sm:grid-cols-2">
                {ages.map((age, i) => (
                  <label key={i} className="block">
                    <span className="cc-label">Child {i + 1} age at check-in *</span>
                    <select
                      required
                      value={age}
                      onChange={(e) =>
                        setAges((prev) => prev.map((a, j) => (j === i ? (e.target.value === '' ? '' : Number(e.target.value)) : a)))
                      }
                      className="cc-field mt-1"
                    >
                      <option value="">Choose an age</option>
                      {Array.from({ length: MAX_CHILD_AGE + 1 }, (_, n) => (
                        <option key={n} value={n}>
                          {n === 0 ? 'Under 1' : `${n}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            )}
            {stepper('Rooms', rooms > 1 ? 'Priced by a specialist' : 'One room', rooms, setRooms, 1, MAX_ROOMS)}
            {rooms > 1 && (
              <p className="cc-support mt-2 rounded-[8px] bg-wait-bg px-3 py-2 text-wait-ink">
                We confirm one room at a time online. Search for a single room to see live prices, and a specialist
                will price the extra rooms with you.
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-[8px] bg-err-bg px-3 py-2 text-[14px] text-err-ink">
            {error}
          </p>
        )}

        <button type="button" onClick={submit} disabled={pending} className="cc-btn-primary mt-1 w-full">
          {pending ? 'Searching…' : 'Explore stays'}
          {!pending && <Icon name="chevron-right" size={18} />}
        </button>
      </div>
    </div>
  );
}
