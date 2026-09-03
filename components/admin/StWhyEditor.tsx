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
          <span className="field-label">Price range</span>
          <input className="field" value={c.priceRange ?? ''} placeholder="e.g. AED 6,500–7,900 per student" onChange={(e) => set('priceRange', e.target.value)} />
        </label>
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
