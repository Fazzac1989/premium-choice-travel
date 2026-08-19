'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fetchStCountryFacts, saveStCountryFacts } from '@/lib/admin/st-country-facts';

export type FactsRow = {
  id: number;
  name: string;
  capital: string;
  currency: string;
  languages: string;
  timezone: string;
  population: string;
  best_time: string;
  avg_temp_c: number | null;
  updatedAt: string | null;
};

const FIELDS = [
  ['capital', 'Capital'],
  ['languages', 'Language'],
  ['currency', 'Currency'],
  ['timezone', 'Time zone'],
  ['population', 'Population'],
  ['best_time', 'Best months'],
] as const;

export default function StCountryFacts({
  rows: initial,
  configured,
}: {
  rows: FactsRow[];
  configured: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | 'all' | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const isEmpty = (r: FactsRow) => !r.capital && !r.currency && !r.languages && !r.timezone;
  const missing = rows.filter(isEmpty);

  const patch = (id: number, key: keyof FactsRow, value: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));

  async function onFetch(id: number) {
    setBusy(id);
    setError(null);
    setDone(null);
    const res = await fetchStCountryFacts(id);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
    setDone('Facts fetched — review them, then edit anything that looks off.');
  }

  async function onFetchAllMissing() {
    setBusy('all');
    setError(null);
    setDone(null);
    let ok = 0;
    const failed: string[] = [];
    for (const row of missing) {
      const res = await fetchStCountryFacts(row.id);
      if (res.ok) ok++;
      else failed.push(row.name);
    }
    setBusy(null);
    router.refresh();
    setDone(
      `Fetched ${ok} of ${missing.length}.` +
        (failed.length ? ` Skipped (not countries, or failed): ${failed.join(', ')}.` : '')
    );
  }

  async function onSave(row: FactsRow) {
    setBusy(row.id);
    setError(null);
    const res = await saveStCountryFacts(row.id, {
      capital: row.capital,
      currency: row.currency,
      languages: row.languages,
      timezone: row.timezone,
      population: row.population,
      best_time: row.best_time,
      avg_temp_c: row.avg_temp_c,
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setOpen(null);
    setDone('Saved.');
    router.refresh();
  }

  return (
    <section className="mt-14 border-t border-line pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-ink">Country facts</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Shown beside the overview on every trip page. Claude drafts them and the average
            temperature is measured from Open-Meteo records — always review before relying on them.
          </p>
        </div>
        {missing.length > 0 && configured && (
          <button className="btn-outline !bg-white !py-2.5" disabled={busy !== null} onClick={onFetchAllMissing}>
            {busy === 'all' ? `Fetching ${missing.length}…` : `Fetch all ${missing.length} missing`}
          </button>
        )}
      </div>

      {!configured && (
        <p className="mt-4 text-sm text-danger">
          The Claude API key isn&apos;t set here, so facts can only be entered by hand.
        </p>
      )}
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {done && <p className="mt-4 text-sm font-semibold text-teal-deep">{done}</p>}

      <div className="card mt-6 divide-y divide-line">
        {rows.map((row) => (
          <div key={row.id}>
            <div className="flex flex-wrap items-center gap-4 p-4">
              <span className="min-w-[140px] flex-1 font-semibold text-ink">{row.name}</span>
              <span className="min-w-[200px] flex-1 truncate text-xs text-ink-soft">
                {isEmpty(row) ? (
                  <em>No facts yet</em>
                ) : (
                  [row.capital, row.currency, row.avg_temp_c !== null ? `${row.avg_temp_c}°C` : null]
                    .filter(Boolean)
                    .join(' · ')
                )}
              </span>
              <button
                className="text-xs font-semibold text-teal-deep hover:underline"
                onClick={() => setOpen(open === row.id ? null : row.id)}
              >
                {open === row.id ? 'Close' : 'Edit'}
              </button>
              {configured && (
                <button
                  className="text-xs font-semibold text-ink-soft hover:text-teal-deep disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => onFetch(row.id)}
                >
                  {busy === row.id ? 'Fetching…' : isEmpty(row) ? 'Fetch' : 'Refetch'}
                </button>
              )}
            </div>

            {open === row.id && (
              <div className="grid gap-4 border-t border-line bg-sand p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FIELDS.map(([key, label]) => (
                    <label key={key}>
                      <span className="field-label">{label}</span>
                      <input
                        className="field"
                        value={row[key]}
                        onChange={(e) => patch(row.id, key, e.target.value)}
                      />
                    </label>
                  ))}
                  <label>
                    <span className="field-label">Average temp °C</span>
                    <input
                      className="field"
                      type="number"
                      step="0.1"
                      value={row.avg_temp_c ?? ''}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((r) =>
                            r.id === row.id
                              ? { ...r, avg_temp_c: e.target.value === '' ? null : Number(e.target.value) }
                              : r
                          )
                        )
                      }
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button className="btn-primary !py-2.5" disabled={busy !== null} onClick={() => onSave(row)}>
                    {busy === row.id ? 'Saving…' : 'Save facts'}
                  </button>
                  <span className="text-xs text-ink-soft">
                    Leave a field empty to hide that row on the trip page.
                    {row.updatedAt &&
                      ` Last updated ${new Date(row.updatedAt).toLocaleDateString('en-GB')}.`}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
