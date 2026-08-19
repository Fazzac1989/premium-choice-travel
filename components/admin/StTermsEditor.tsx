'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { saveStBookingTerms } from '@/lib/admin/st-misc-actions';

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const iconBtn =
  'rounded-lg border border-line px-2 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-teal hover:text-teal-deep disabled:opacity-40';

export default function StTermsEditor({ initial }: { initial: string[] }) {
  const router = useRouter();
  const [terms, setTerms] = useState(initial.length ? initial : ['']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await saveStBookingTerms(terms.map((t) => t.trim()).filter(Boolean));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  return (
    <>
      <div className="card mt-8 grid gap-3 p-6">
        {terms.map((term, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-6 shrink-0 pt-2.5 text-right font-serif italic text-teal-deep">
              {i + 1}.
            </span>
            <textarea
              rows={2}
              className="field"
              value={term}
              onChange={(e) => setTerms(terms.map((t, j) => (j === i ? e.target.value : t)))}
            />
            <div className="flex shrink-0 gap-1 pt-1">
              <button
                className={iconBtn}
                disabled={i === 0}
                onClick={() => setTerms(move(terms, i, i - 1))}
                aria-label={`Move term ${i + 1} up`}
              >
                ↑
              </button>
              <button
                className={iconBtn}
                disabled={i === terms.length - 1}
                onClick={() => setTerms(move(terms, i, i + 1))}
                aria-label={`Move term ${i + 1} down`}
              >
                ↓
              </button>
              <button
                className={iconBtn}
                onClick={() => setTerms(terms.filter((_, j) => j !== i))}
                aria-label={`Remove term ${i + 1}`}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button className="btn-outline !bg-white !py-2.5" onClick={() => setTerms([...terms, ''])}>
          + Add term
        </button>
        <button className="btn-primary !py-2.5" onClick={onSave} disabled={busy}>
          {busy ? 'Saving…' : 'Save terms'}
        </button>
        {saved && <span className="text-sm font-semibold text-teal-deep">Saved ✓</span>}
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>
    </>
  );
}
