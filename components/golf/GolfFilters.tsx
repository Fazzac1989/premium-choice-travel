'use client';

import { useRef } from 'react';
import {
  GOLF_BOARDS,
  GOLF_LENGTHS,
  GOLF_ROUNDS,
  GOLF_TRIP_TYPES,
  type GolfCriteria,
} from '@/lib/golf/catalogue';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A plain GET form, so every filtered list has its own shareable address and
 * works without JavaScript. With JavaScript a change submits at once; the
 * Apply button is there for everyone else. The catalogue is our own data, not
 * a supplier search, so re-running the page per change costs nothing.
 */
export default function GolfFilters({
  action,
  criteria,
  geography,
  showBudget,
  idPrefix = 'gf',
}: {
  idPrefix?: string;
  action: string;
  criteria: GolfCriteria;
  geography: { region: string; countries: { slug: string; country: string; count: number }[] }[];
  /** Budget only makes sense once some trips carry an approved price. */
  showBudget: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const submit = () => form.current?.requestSubmit();
  const where = criteria.country ? `c:${criteria.country}` : criteria.region ? `r:${criteria.region}` : '';

  return (
    <form
      ref={form}
      action={action}
      method="get"
      className="space-y-5"
      // Leave unused filters out of the address so links stay short and readable.
      onSubmit={(e) => {
        const off: HTMLInputElement[] = [];
        for (const el of Array.from(e.currentTarget.elements)) {
          const input = el as HTMLInputElement;
          if (input.name && input.type !== 'checkbox' && !input.value) {
            input.disabled = true;
            off.push(input);
          }
        }
        // The form data is taken as this handler returns; switch them back on
        // so a Back button restoring the page from cache finds a working form.
        setTimeout(() => off.forEach((i) => (i.disabled = false)), 0);
      }}
    >
      {/* Where: one select over the single geography tree. Hidden inputs carry the choice. */}
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-q`}>Search</label>
        <input
          id={`${idPrefix}-q`}
          name="q"
          defaultValue={criteria.q}
          className="field"
          placeholder="Destination, hotel or course"
          type="search"
        />
      </div>
      <div>
        <label className="field-label" htmlFor={`${idPrefix}-where`}>Destination</label>
        <select
          id={`${idPrefix}-where`}
          className="field"
          defaultValue={where}
          onChange={(e) => {
            const v = e.target.value;
            const region = form.current?.elements.namedItem('region') as HTMLInputElement;
            const country = form.current?.elements.namedItem('country') as HTMLInputElement;
            region.value = v.startsWith('r:') ? v.slice(2) : '';
            country.value = v.startsWith('c:') ? v.slice(2) : '';
            submit();
          }}
        >
          <option value="">Anywhere</option>
          {geography.map((g) => (
            <optgroup key={g.region} label={g.region}>
              <option value={`r:${g.region}`}>All of {g.region}</option>
              {g.countries.map((c) => (
                <option key={c.slug} value={`c:${c.slug}`}>
                  {c.country} ({c.count})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <input type="hidden" name="region" defaultValue={criteria.region} />
        <input type="hidden" name="country" defaultValue={criteria.country} />
      </div>

      <Select idPrefix={idPrefix} name="type" label="Trip type" value={criteria.type} onChange={submit}
        options={GOLF_TRIP_TYPES.map((t) => [t.key, t.label])} any="Any kind of trip" />
      <Select idPrefix={idPrefix} name="length" label="Nights" value={criteria.length} onChange={submit}
        options={GOLF_LENGTHS.map((l) => [l.key, l.label])} any="Any length" />
      <Select idPrefix={idPrefix} name="rounds" label="Rounds" value={criteria.rounds} onChange={submit}
        options={GOLF_ROUNDS.map((r) => [r.key, r.label])} any="Any number" />
      <Select idPrefix={idPrefix} name="board" label="Board" value={criteria.board} onChange={submit}
        options={GOLF_BOARDS.map((b) => [b.key, b.label])} any="Any board" />
      <Select idPrefix={idPrefix} name="month" label="Travel month" value={criteria.month} onChange={submit}
        options={MONTHS.map((m, i) => [String(i + 1), m])} any="Any month" />
      {showBudget && (
        <Select idPrefix={idPrefix} name="budget" label="Budget per person" value={criteria.budget} onChange={submit}
          options={[3000, 5000, 7500, 10000, 15000, 20000].map((n) => [String(n), `Up to AED ${n.toLocaleString('en-GB')}`])}
          any="Any budget" />
      )}

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" name="group" value="1" defaultChecked={criteria.group} onChange={submit}
          className="h-4 w-4 accent-teal-deep" />
        Suits groups and societies
      </label>

      <noscript>
        <button type="submit" className="btn-primary w-full">Apply</button>
      </noscript>
    </form>
  );
}

function Select({
  idPrefix,
  name,
  label,
  value,
  options,
  any,
  onChange,
}: {
  idPrefix: string;
  name: string;
  label: string;
  value: string;
  options: string[][];
  any: string;
  onChange: () => void;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={`${idPrefix}-${name}`}>{label}</label>
      <select id={`${idPrefix}-${name}`} name={name} defaultValue={value} className="field" onChange={onChange}>
        <option value="">{any}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </div>
  );
}
