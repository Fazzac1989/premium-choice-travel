'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/staycations/coastal/Icon';
import SearchLoader from './SearchLoader';
import { suggestPlaces, type PlaceSuggestion } from '@/lib/staycations/search-actions';
import {
  MAX_ADULTS,
  MAX_CHILDREN,
  MAX_NIGHTS,
  partyLabel,
  staySearchQuery,
  UAE_DESTINATIONS,
  type StaySearch,
} from '@/lib/staycations/stay-search';

/**
 * The search pill, laid out like the trade portal's (founder, 2026-10-03): where · check-in ·
 * how long for · guests · search, one row on a wide screen and stacked on a phone, in the
 * Staycations colours. Picking a hotel goes straight to its page; picking a place searches it.
 */

const todayIso = () => new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000 + 4 * 3_600_000).toISOString().slice(0, 10);

export default function SearchPill({
  base,
  initial,
  hotel,
}: {
  base: string;
  initial: StaySearch;
  /** on a hotel's page: the pill starts on that hotel */
  hotel?: { name: string; slug: string };
}) {
  const router = useRouter();
  const ids = useId();
  const [where, setWhere] = useState(hotel?.name ?? (initial.where || (initial.cityCode ? '' : 'Dubai')));
  const [cityCode, setCityCode] = useState<string | null>(hotel ? null : (initial.cityCode ?? (initial.where ? null : 'DXB')));
  const [hotelSlug, setHotelSlug] = useState<string | null>(hotel?.slug ?? null);
  const [checkIn, setCheckIn] = useState(initial.checkIn ?? inDays(14));
  const [nights, setNights] = useState(initial.nights);
  const [adults, setAdults] = useState(initial.adults);
  const [ages, setAges] = useState<number[]>(initial.childAges);
  const [error, setError] = useState('');
  // the next page asks the hotels for prices, which takes seconds: show it is happening at once
  const [navigating, startNavigating] = useTransition();

  // where: the list under the field
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PlaceSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const whereRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const defaults: PlaceSuggestion[] = UAE_DESTINATIONS.map((d) => ({
    type: 'city',
    label: d.label,
    cityCode: d.cityCode,
    slug: null,
  }));

  useEffect(() => {
    if (!open) return;
    const text = where.trim();
    if (text.length < 2 || cityCode) {
      setOptions(defaults);
      return;
    }
    let live = true;
    const t = setTimeout(async () => {
      const found = await suggestPlaces(text);
      if (live) {
        setOptions(found);
        setActive(0);
      }
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [where, open, cityCode]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (o: PlaceSuggestion) => {
    setWhere(o.label);
    setCityCode(o.cityCode);
    setHotelSlug(o.type === 'hotel' ? o.slug : null);
    setOpen(false);
    setError('');
  };

  // guests
  const [guestsOpen, setGuestsOpen] = useState(false);
  const guestsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!guestsRef.current?.contains(e.target as Node)) setGuestsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityCode && !hotelSlug) {
      const exact = UAE_DESTINATIONS.find((d) => d.label.toLowerCase() === where.trim().toLowerCase());
      if (!exact) {
        setError('Choose a place or a hotel from the list.');
        setOpen(true);
        whereRef.current?.focus();
        return;
      }
      setCityCode(exact.cityCode);
    }
    if (!checkIn || checkIn < todayIso()) {
      setError('Choose a check-in date from today on.');
      return;
    }
    if (ages.some((a) => a < 0)) {
      setError('Add each child’s age at check-in: hotels price children by age.');
      setGuestsOpen(true);
      return;
    }
    const code = cityCode ?? UAE_DESTINATIONS.find((d) => d.label.toLowerCase() === where.trim().toLowerCase())?.cityCode ?? null;
    const query = staySearchQuery({ checkIn, nights, adults, childAges: ages });
    const to = hotelSlug
      ? `${base}/hotels/${hotelSlug}${query}`
      : `${base}/hotels${staySearchQuery({ where: where.trim(), cityCode: code, checkIn, nights, adults, childAges: ages })}`;
    startNavigating(() => router.push(to));
  };

  const segment = 'flex min-w-0 flex-col px-4 py-2.5';
  const caption = 'text-[12px] font-medium leading-[16px] text-sea-soft';
  const value = 'w-full bg-transparent text-[15px] font-semibold leading-[22px] text-sea-ink outline-none';
  const divider = 'border-b border-sea-line md:border-b-0 md:border-e';

  return (
    <form role="search" onSubmit={submit} aria-label="Search stays" className="w-full">
      {navigating && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-white">
          <SearchLoader />
        </div>
      )}
      <div className="cc-panel grid md:grid-cols-[1.6fr_1fr_0.8fr_1.2fr_auto] md:items-stretch md:rounded-full">
        {/* where */}
        <div ref={boxRef} className={`relative ${segment} ${divider} md:ps-6`}>
          <label htmlFor={`${ids}-where`} className={caption}>
            Where
          </label>
          <input
            id={`${ids}-where`}
            ref={whereRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${ids}-where-list`}
            aria-autocomplete="list"
            autoComplete="off"
            value={where}
            placeholder="A place or a hotel"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setWhere(e.target.value);
              setCityCode(null);
              setHotelSlug(null);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (!open) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(options.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter' && options[active]) {
                e.preventDefault();
                pick(options[active]!);
              } else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
            }}
            className={value}
          />
          {open && options.length > 0 && (
            <ul
              id={`${ids}-where-list`}
              role="listbox"
              className="absolute start-0 top-full z-30 mt-2 max-h-80 w-full min-w-[280px] overflow-y-auto rounded-[12px] border border-sea-line bg-white py-1 shadow-[0_12px_32px_rgba(22,75,87,0.16)]"
            >
              {options.map((o, i) => (
                <li key={`${o.type}-${o.label}-${o.slug ?? o.cityCode}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-[15px] text-sea-ink ${i === active ? 'bg-mist' : ''}`}
                  >
                    <Icon name={o.type === 'hotel' ? 'bed' : 'pin'} size={18} />
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    <span className="shrink-0 text-[12px] text-sea-soft">{o.type === 'hotel' ? 'Hotel' : 'Emirate'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* check-in */}
        <div className={`${segment} ${divider}`}>
          <label htmlFor={`${ids}-in`} className={caption}>
            Check-in
          </label>
          <input
            id={`${ids}-in`}
            type="date"
            min={todayIso()}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className={value}
          />
        </div>

        {/* how long for */}
        <div className={`${segment} ${divider}`}>
          <label htmlFor={`${ids}-nights`} className={caption}>
            How long for
          </label>
          <select id={`${ids}-nights`} value={nights} onChange={(e) => setNights(Number(e.target.value))} className={value}>
            {Array.from({ length: MAX_NIGHTS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} night{n === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </div>

        {/* guests */}
        <div ref={guestsRef} className={`relative ${segment} ${divider} md:border-e-0`}>
          <span id={`${ids}-guests`} className={caption}>
            Guests
          </span>
          <button
            type="button"
            aria-labelledby={`${ids}-guests`}
            aria-expanded={guestsOpen}
            onClick={() => setGuestsOpen((o) => !o)}
            className={`${value} text-start`}
          >
            {partyLabel({ adults, childAges: ages })} · 1 room
          </button>
          {guestsOpen && (
            <div className="absolute end-0 top-full z-30 mt-2 w-[300px] rounded-[12px] border border-sea-line bg-white p-4 shadow-[0_12px_32px_rgba(22,75,87,0.16)]">
              {(
                [
                  ['Adults', adults, 1, MAX_ADULTS, (n: number) => setAdults(n)],
                  [
                    'Children',
                    ages.length,
                    0,
                    MAX_CHILDREN,
                    (n: number) => setAges((a) => (n > a.length ? [...a, -1] : a.slice(0, n))),
                  ],
                ] as const
              ).map(([label, n, lo, hi, set]) => (
                <div key={label} className="flex items-center justify-between py-2">
                  <span className="text-[15px] font-medium text-sea-ink">{label}</span>
                  <span className="flex items-center gap-3">
                    <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={n <= lo} onClick={() => set(n - 1)} className="cc-icon-btn disabled:opacity-40">
                      <Icon name="minus" size={16} />
                    </button>
                    <span className="w-5 text-center tabular-nums text-sea-ink">{n}</span>
                    <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={n >= hi} onClick={() => set(n + 1)} className="cc-icon-btn disabled:opacity-40">
                      <Icon name="plus" size={16} />
                    </button>
                  </span>
                </div>
              ))}
              {ages.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ages.map((a, i) => (
                    <label key={i} className="block">
                      <span className="cc-label">Child {i + 1} age</span>
                      <select
                        value={a}
                        onChange={(e) => setAges((all) => all.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                        className="cc-field mt-1 !min-h-[40px] !px-2 text-[15px]"
                      >
                        <option value={-1}>Age</option>
                        {Array.from({ length: 18 }, (_, k) => k).map((k) => (
                          <option key={k} value={k}>
                            {k === 0 ? 'Under 1' : `${k}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}
              <p className="cc-support mt-3">One room per booking online; call us for more.</p>
              <button type="button" onClick={() => setGuestsOpen(false)} className="cc-btn-primary mt-3 w-full !min-h-[44px]">
                Done
              </button>
            </div>
          )}
        </div>

        {/* search */}
        <div className="flex items-center p-2 md:pe-2">
          <button type="submit" className="cc-btn-primary w-full !min-h-[48px] md:!h-12 md:!w-12 md:!rounded-full md:!px-0" aria-label="Search stays">
            <Icon name="search" size={20} />
            <span className="md:sr-only">Search</span>
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[14px] font-medium text-err-ink">
          {error}
        </p>
      )}
    </form>
  );
}
