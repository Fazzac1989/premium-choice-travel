'use client';

import { useState } from 'react';
import type { BrochurePage, PageContent } from '@/lib/brochure/schema';

/**
 * The "Why <country>" page of one trip.
 *
 * Five things: why the country, our own view, who it suits, what it costs,
 * and five educational values. The AI writes the first three and the five
 * values from the trip's own material; the price range is yours to type,
 * because the trip's base price is not for print.
 */
export default function StWhyEditor({
  page,
  country,
  busy,
  onSave,
  onApprove,
  onRecompose,
}: {
  page: BrochurePage;
  country: string;
  busy: boolean;
  onSave: (content: PageContent) => void;
  onApprove: () => void;
  onRecompose: () => void;
}) {
  const [c, setC] = useState<PageContent>(page.content ?? {});
  const set = (k: keyof PageContent, v: any) => setC((prev) => ({ ...prev, [k]: v }));
  const values = c.educationalValues ?? [];
  const setValue = (i: number, patch: Partial<{ title: string; detail: string }>) => {
    const next = [...values];
    next[i] = { ...(next[i] ?? { title: '', detail: '' }), ...patch };
    set('educationalValues', next);
  };
  const bands = c.priceBands ?? [];
  const setBand = (i: number, patch: Partial<{ dates: string; price: string }>) => {
    const next = [...(bands.length ? bands : [{ dates: '', price: '' }])];
    next[i] = { ...(next[i] ?? { dates: '', price: '' }), ...patch };
    set('priceBands', next);
  };
  const empty = !c.whyCountry && !c.pctView && values.length === 0;

  return (
    <div className="grid gap-4 border-t border-line bg-sand p-5">
      {empty && (
        <p className="rounded-xl bg-white px-4 py-3 text-sm text-ink-soft">
          Nothing written yet. &ldquo;Write with AI&rdquo; drafts everything but the price from the
          trip&apos;s own material; then edit as you like.
        </p>
      )}

      <label>
        <span className="field-label">Why {country}</span>
        <textarea rows={3} className="field" value={c.whyCountry ?? ''} onChange={(e) => set('whyCountry', e.target.value)} />
      </label>

      <label>
        <span className="field-label">Our PCT view</span>
        <textarea rows={2} className="field" value={c.pctView ?? ''} onChange={(e) => set('pctView', e.target.value)} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Suited to (age / year group)</span>
          <input className="field" value={c.ageGroup ?? ''} placeholder="e.g. Years 9–11 (ages 13–16)" onChange={(e) => set('ageGroup', e.target.value)} />
        </label>
        <label>
          <span className="field-label">Price note (optional)</span>
          <input className="field" value={c.priceRange ?? ''} placeholder="e.g. per student, based on 20 travelling" onChange={(e) => set('priceRange', e.target.value)} />
        </label>
      </div>

      <div>
        <span className="field-label">Prices by date</span>
        <p className="mb-2 text-xs text-ink-soft">
          Free text on both sides: &ldquo;Feb half term 2027&rdquo; and &ldquo;AED 7,450 per student&rdquo; are
          both fine. Typed by you, never by the AI, and kept when the page is rewritten.
        </p>
        <div className="grid gap-2">
          {(bands.length ? bands : [{ dates: '', price: '' }]).map((band, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="field w-1/2"
                placeholder="Dates, e.g. 14–19 February 2027"
                value={band.dates}
                onChange={(e) => setBand(i, { dates: e.target.value })}
              />
              <input
                className="field flex-1"
                placeholder="Price, e.g. AED 7,450 per student"
                value={band.price}
                onChange={(e) => setBand(i, { price: e.target.value })}
              />
              <button
                type="button"
                className="rounded-lg border border-line px-3 text-xs font-semibold text-ink-soft hover:text-danger"
                title="Remove this row"
                onClick={() => set('priceBands', bands.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-teal-deep hover:underline"
          onClick={() => set('priceBands', [...(bands.length ? bands : [{ dates: '', price: '' }]), { dates: '', price: '' }])}
        >
          + Add another date range
        </button>
      </div>

      <div>
        <span className="field-label">Educational value — five things a student gains</span>
        <div className="grid gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-2">
              <span className="w-6 pt-3 text-right text-xs tabular-nums text-ink-soft">{i + 1}</span>
              <input
                className="field w-56"
                placeholder="Title"
                value={values[i]?.title ?? ''}
                onChange={(e) => setValue(i, { title: e.target.value })}
              />
              <input
                className="field flex-1"
                placeholder="What in the trip delivers it"
                value={values[i]?.detail ?? ''}
                onChange={(e) => setValue(i, { detail: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-primary !py-2.5"
          disabled={busy}
          onClick={() =>
            onSave({
              ...c,
              educationalValues: values.filter((v) => v && (v.title?.trim() || v.detail?.trim())).map((v) => ({ title: v.title.trim(), detail: v.detail.trim() })),
              priceBands: bands.filter((b) => b.dates?.trim() || b.price?.trim()).map((b) => ({ dates: b.dates.trim(), price: b.price.trim() })),
            })
          }
        >
          Save page
        </button>
        <button className="btn-outline !bg-white !py-2.5" disabled={busy} onClick={onApprove}>
          Mark approved
        </button>
        <button className="btn-outline !bg-white !py-2.5" disabled={busy} onClick={onRecompose}>
          {empty ? 'Write with AI' : 'Rewrite with AI'}
        </button>
      </div>
    </div>
  );
}
