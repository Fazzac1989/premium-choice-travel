'use client';

import type { GuideSection } from '@/lib/types';

/** Repeatable heading + body sections (when-to-travel entries, culture blocks). */
export default function SectionsEditor({
  label,
  hint,
  items,
  onChange,
  headingPlaceholder,
  bodyPlaceholder,
}: {
  label: string;
  hint?: string;
  items: GuideSection[];
  onChange: (items: GuideSection[]) => void;
  headingPlaceholder?: string;
  bodyPlaceholder?: string;
}) {
  const update = (i: number, patch: Partial<GuideSection>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="field-label !mb-0">{label}</span>
        {hint && <span className="text-[11px] text-ink-soft">{hint}</span>}
      </div>
      <div className="mt-2 space-y-3">
        {items.map((s, i) => (
          <div key={i} className="rounded-xl border border-line bg-sand/60 p-4">
            <div className="flex gap-2">
              <input
                className="field"
                value={s.heading}
                placeholder={headingPlaceholder ?? 'Heading'}
                onChange={(e) => update(i, { heading: e.target.value })}
              />
              <div className="flex shrink-0 gap-1 pt-1.5">
                <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-ink-soft hover:bg-white" aria-label="Move up">↑</button>
                <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-ink-soft hover:bg-white" aria-label="Move down">↓</button>
                <button type="button" onClick={() => remove(i)} className="rounded p-1 text-danger hover:bg-white" aria-label="Remove">✕</button>
              </div>
            </div>
            <textarea
              rows={2}
              className="field mt-2"
              value={s.body}
              placeholder={bodyPlaceholder ?? 'Text…'}
              onChange={(e) => update(i, { body: e.target.value })}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, { heading: '', body: '' }])}
        className="mt-2 text-sm font-semibold text-teal-deep hover:underline"
      >
        + Add section
      </button>
    </div>
  );
}
