'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon from './Icon';
import StaySearchForm from './StaySearchForm';
import { anywhereLabel, type PlaceGroup } from '@/lib/staycations/places';
import {
  criteriaQuery,
  dateRangeLabel,
  guestSummary,
  type SearchCriteria,
  type SortKey,
} from '@/lib/staycations/search-criteria';

/**
 * The three things above a results list: what you searched for, how it is
 * ordered, and how to narrow it.
 *
 * Filters are links, so the URL is the state — a filtered list can be shared,
 * reloaded and returned to from a hotel page with everything intact.
 */

export type Facets = {
  /** Regions with stays in them, grouped by country. */
  places: PlaceGroup[];
  emirates: string[];
  bands: { band: number; label: string }[];
  meals: string[];
  stars: string[];
  tags: { key: string; label: string }[];
};

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'price', label: 'Price' },
  { key: 'stars', label: 'Star rating' },
  { key: 'name', label: 'Name A–Z' },
];

export default function ResultsControls({
  base,
  criteria,
  facets,
  count,
  pricedByStay,
}: {
  base: string;
  criteria: SearchCriteria;
  facets: Facets;
  count: number;
  /** True when the list carries real totals, which is what makes price sorting mean anything. */
  pricedByStay: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<'search' | 'filters' | 'map' | null>(null);
  const panel = (name: typeof open) => () => setOpen(open === name ? null : name);

  const href = (patch: Partial<SearchCriteria>) => `${base}/hotels${criteriaQuery({ ...criteria, ...patch })}`;
  const activeFilters = [criteria.emirate, criteria.budget, criteria.meal, criteria.stars, criteria.tag].filter(Boolean).length;

  const chip = (label: string, on: boolean, to: string) => (
    <Link key={label + to} href={to} scroll={false} className={`cc-chip !min-h-[40px] !px-3.5 text-[14px] ${on ? 'cc-chip-on' : ''}`}>
      {label}
    </Link>
  );

  return (
    <div className="space-y-3">
      {/* What you searched for */}
      <button
        type="button"
        onClick={panel('search')}
        aria-expanded={open === 'search'}
        className="flex min-h-[56px] w-full items-center gap-3 rounded-[10px] border border-sea-line bg-white px-4 text-left transition-colors hover:border-petrol"
      >
        <Icon name="calendar" size={20} className="shrink-0 text-petrol" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium leading-[20px] text-sea-ink">
            {dateRangeLabel(criteria)}
            {criteria.emirate ? ` · ${criteria.emirate}` : ''}
          </span>
          <span className="cc-support block truncate">{guestSummary(criteria)}</span>
        </span>
        <span className="shrink-0 text-[14px] font-semibold text-petrol">Edit</span>
      </button>

      {open === 'search' && (
        <div className="rounded-[12px] border border-sea-line bg-shell p-3">
          <StaySearchForm base={base} initial={criteria} places={facets.places} variant="sheet" onDone={() => setOpen(null)} />
        </div>
      )}

      {/* Sort · Filters · Map */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="cc-chip relative !px-3.5">
          <Icon name="sort" size={18} className="text-petrol" />
          <span className="text-[14px]">Sort</span>
          <select
            aria-label="Sort results"
            value={criteria.sort}
            onChange={(e) => router.push(href({ sort: e.target.value as SortKey }), { scroll: false })}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="text-[14px] font-semibold text-sea-ink">
            {SORTS.find((s) => s.key === criteria.sort)?.label}
          </span>
        </label>

        <button type="button" onClick={panel('filters')} aria-expanded={open === 'filters'} className={`cc-chip !px-3.5 ${activeFilters ? 'cc-chip-on' : ''}`}>
          <Icon name="filters" size={18} className={activeFilters ? 'text-white' : 'text-petrol'} />
          <span className="text-[14px]">Filters{activeFilters ? ` · ${activeFilters}` : ''}</span>
        </button>

        <button type="button" onClick={panel('map')} aria-expanded={open === 'map'} className="cc-chip !px-3.5">
          <Icon name="map" size={18} className="text-petrol" />
          <span className="text-[14px]">Map</span>
        </button>

        <span className="ml-auto cc-support">{count} stay{count === 1 ? '' : 's'}</span>
      </div>

      {open === 'filters' && (
        <div className="space-y-4 rounded-[12px] border border-sea-line bg-shell p-4">
          <div>
            <p className="cc-label mb-2">Where</p>
            <div className="flex flex-wrap gap-2">
              {chip(anywhereLabel(facets.places.map((p) => p.country)), !criteria.emirate, href({ emirate: '' }))}
            </div>
            {facets.places.map((group) => (
              <div key={group.country} className="mt-2.5">
                {facets.places.length > 1 && <p className="cc-support mb-1.5">{group.label}</p>}
                <div className="flex flex-wrap gap-2">
                  {group.regions.map((e) =>
                    chip(e, criteria.emirate === e, href({ emirate: criteria.emirate === e ? '' : e })),
                  )}
                </div>
              </div>
            ))}
          </div>

          {facets.bands.length > 0 && (
            <div>
              <p className="cc-label mb-2">Guide price a night</p>
              <div className="flex flex-wrap gap-2">
                {chip('Any', !criteria.budget, href({ budget: '' }))}
                {facets.bands.map((b) =>
                  chip(b.label, criteria.budget === String(b.band), href({ budget: criteria.budget === String(b.band) ? '' : String(b.band) })),
                )}
              </div>
              <p className="cc-support mt-2">
                A guide set by our specialists, per room per night for two adults — not a quote.
              </p>
            </div>
          )}

          <div>
            <p className="cc-label mb-2">Meal plan</p>
            <div className="flex flex-wrap gap-2">
              {chip('Any', !criteria.meal, href({ meal: '' }))}
              {facets.meals.map((m) => chip(m, criteria.meal === m, href({ meal: criteria.meal === m ? '' : m })))}
            </div>
          </div>

          <div>
            <p className="cc-label mb-2">Star rating</p>
            <div className="flex flex-wrap gap-2">
              {chip('Any', !criteria.stars, href({ stars: '' }))}
              {facets.stars.map((s) => chip(`${s}★`, criteria.stars === s, href({ stars: criteria.stars === s ? '' : s })))}
            </div>
          </div>

          <div>
            <p className="cc-label mb-2">Good for</p>
            <div className="flex flex-wrap gap-2">
              {facets.tags.map((t) => chip(t.label, criteria.tag === t.key, href({ tag: criteria.tag === t.key ? '' : t.key })))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-sea-line pt-3">
            <Link
              href={href({ emirate: '', budget: '', meal: '', stars: '', tag: '' })}
              scroll={false}
              className="text-[15px] font-semibold text-petrol"
            >
              Clear all filters
            </Link>
            <button type="button" onClick={() => setOpen(null)} className="cc-btn-primary !min-h-[44px] !px-5 text-[15px]">
              Show {count} stay{count === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {open === 'map' && (
        <div className="rounded-[12px] border border-sea-line bg-shell p-4">
          <div className="flex items-start gap-3">
            <Icon name="info" size={20} className="mt-0.5 shrink-0 text-petrol" />
            <div>
              <p className="text-[15px] font-medium text-sea-ink">Map view isn’t available yet</p>
              <p className="cc-support mt-1">
                We would rather show no map than a made-up one. It arrives with our mapping provider; until then,
                browse by area.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {facets.emirates.map((e) => chip(e, criteria.emirate === e, href({ emirate: criteria.emirate === e ? '' : e })))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!pricedByStay && criteria.sort === 'price' && (
        <p className="cc-support">Ordered by our guide prices — add dates to sort by a real total.</p>
      )}
    </div>
  );
}
