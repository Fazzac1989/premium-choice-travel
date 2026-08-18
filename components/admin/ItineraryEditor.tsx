'use client';

import type { ItineraryDay } from '@/lib/types';

export type LinkOption = { id: number; label: string };

function LinkPicker({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: LinkOption[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                active ? 'border-teal bg-teal text-white' : 'border-line bg-white text-ink-soft hover:border-teal hover:text-teal-deep'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ItineraryEditor({
  items,
  onChange,
  hotelOptions = [],
  experienceOptions = [],
}: {
  items: ItineraryDay[];
  onChange: (items: ItineraryDay[]) => void;
  hotelOptions?: LinkOption[];
  experienceOptions?: LinkOption[];
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
            {(hotelOptions.length > 0 || experienceOptions.length > 0) && (
              <div className="mt-3 space-y-2.5 rounded-lg border border-line bg-white p-3">
                <LinkPicker
                  label="Stay on this stage"
                  options={hotelOptions}
                  selected={day.hotelIds ?? []}
                  onToggle={(id) =>
                    update(i, {
                      hotelIds: (day.hotelIds ?? []).includes(id)
                        ? (day.hotelIds ?? []).filter((x) => x !== id)
                        : [...(day.hotelIds ?? []), id],
                    })
                  }
                />
                <LinkPicker
                  label="Experiences on this stage"
                  options={experienceOptions}
                  selected={day.experienceIds ?? []}
                  onToggle={(id) =>
                    update(i, {
                      experienceIds: (day.experienceIds ?? []).includes(id)
                        ? (day.experienceIds ?? []).filter((x) => x !== id)
                        : [...(day.experienceIds ?? []), id],
                    })
                  }
                />
              </div>
            )}
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
