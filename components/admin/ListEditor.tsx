'use client';

/** Repeatable single-line (or multi-line) string list editor. */
export default function ListEditor({
  label,
  hint,
  items,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const update = (i: number, value: string) => {
    const next = items.slice();
    next[i] = value;
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
      <div className="mt-2 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            {multiline ? (
              <textarea
                rows={2}
                className="field"
                value={item}
                placeholder={placeholder}
                onChange={(e) => update(i, e.target.value)}
              />
            ) : (
              <input
                className="field"
                value={item}
                placeholder={placeholder}
                onChange={(e) => update(i, e.target.value)}
              />
            )}
            <div className="flex shrink-0 gap-1 pt-1.5">
              <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-ink-soft hover:bg-sand" aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-ink-soft hover:bg-sand" aria-label="Move down">↓</button>
              <button type="button" onClick={() => remove(i)} className="rounded p-1 text-danger hover:bg-sand" aria-label="Remove">✕</button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="mt-2 text-sm font-semibold text-teal-deep hover:underline"
      >
        + Add {label.toLowerCase().replace(/s$/, '')}
      </button>
    </div>
  );
}
