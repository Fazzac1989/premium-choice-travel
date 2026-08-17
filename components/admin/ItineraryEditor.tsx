'use client';

import type { ItineraryDay } from '@/lib/types';

export default function ItineraryEditor({
  items,
  onChange,
}: {
  items: ItineraryDay[];
  onChange: (items: ItineraryDay[]) => void;
}) {
  const update = (i: number, patch: Partial<ItineraryDay>) => {
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
      <span className="field-label">Itinerary</span>
      <div className="space-y-3">
        {items.map((day, i) => (
          <div key={i} className="rounded-xl border border-line bg-sand/60 p-4">
            <div className="flex gap-2">
              <input
                className="field !w-32 shrink-0"
                value={day.label}
                placeholder="Day 1"
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <input
                className="field"
                value={day.title}
                placeholder="Title, e.g. Arrival in paradise"
                onChange={(e) => update(i, { title: e.target.value })}
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
              value={day.description}
              placeholder="What happens on this day…"
              onChange={(e) => update(i, { description: e.target.value })}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, { label: `Day ${items.length + 1}`, title: '', description: '' }])}
        className="mt-2 text-sm font-semibold text-teal-deep hover:underline"
      >
        + Add day
      </button>
    </div>
  );
}
