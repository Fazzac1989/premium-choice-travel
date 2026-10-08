'use client';

import { GOLF_SORTS, type GolfCriteria } from '@/lib/golf/catalogue';

/**
 * Sort order as its own little GET form: the current filters ride along as
 * hidden fields, so changing the order never loses them.
 */
export default function GolfSort({ action, criteria, showPrice }: { action: string; criteria: GolfCriteria; showPrice: boolean }) {
  const keep = Object.entries(criteria).filter(([k, v]) => k !== 'sort' && v !== '' && v !== false);
  return (
    <form action={action} method="get" className="flex items-center gap-2">
      {keep.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v === true ? '1' : String(v)} />
      ))}
      <label htmlFor="golf-sort" className="text-sm font-semibold text-ink-soft">Sort by</label>
      <select
        id="golf-sort"
        name="sort"
        defaultValue={criteria.sort}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-golf-line bg-white px-3 py-2 text-sm font-semibold text-golf-navy outline-none focus:border-fairway"
      >
        {GOLF_SORTS.filter((s) => showPrice || s.key !== 'price').map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>
      <noscript><button type="submit" className="btn-outline !py-2 text-sm">Sort</button></noscript>
    </form>
  );
}
