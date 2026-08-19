'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { addStTerm, updateStTerm, deleteStTerm, type TaxonomyKind } from '@/lib/admin/st-taxonomy-actions';

export type TaxonomyRow = {
  id: number;
  name: string;
  slug: string;
  region?: string | null;
  tripCount: number;
};

const REGIONS = ['Europe', 'Asia', 'Africa', 'Americas', 'Oceania', 'Middle East'];

export default function StTaxonomyManager({
  kind,
  rows,
}: {
  kind: TaxonomyKind;
  rows: TaxonomyRow[];
}) {
  const router = useRouter();
  const isCountry = kind === 'country';

  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegion, setEditRegion] = useState('');

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await addStTerm(kind, name, region.trim() || null);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setName('');
    setRegion('');
    router.refresh();
  }

  function startEdit(row: TaxonomyRow) {
    setEditingId(row.id);
    setEditName(row.name);
    setEditRegion(row.region ?? '');
    setError(null);
  }

  async function onSaveEdit(row: TaxonomyRow) {
    if (!editName.trim()) return;
    setBusy(true);
    setError(null);
    const res = await updateStTerm(kind, row.id, editName, editRegion.trim() || null);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditingId(null);
    router.refresh();
  }

  async function onDelete(row: TaxonomyRow) {
    if (row.tripCount > 0) {
      setError(`"${row.name}" is used by ${row.tripCount} trip${row.tripCount === 1 ? '' : 's'} — reassign first.`);
      return;
    }
    if (!window.confirm(`Delete "${row.name}"?`)) return;
    setBusy(true);
    setError(null);
    const res = await deleteStTerm(kind, row.id);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onAdd} className="mt-8 flex flex-wrap items-end gap-3">
        <label className="min-w-[240px] flex-1">
          <span className="field-label">New {kind}</span>
          <input
            className="field"
            placeholder={isCountry ? 'e.g. Portugal' : 'e.g. Geography'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {isCountry && (
          <label className="w-48">
            <span className="field-label">Region</span>
            <select className="field" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">—</option>
              {REGIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        )}
        <button className="btn-primary !py-2.5" disabled={busy || !name.trim()}>
          Add
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="card mt-6 divide-y divide-line">
        {rows.length === 0 && (
          <p className="p-10 text-center text-sm text-ink-soft">Nothing here yet.</p>
        )}

        {rows.map((row) =>
          editingId === row.id ? (
            <div key={row.id} className="flex flex-wrap items-end gap-3 bg-sand p-4">
              <label className="min-w-[200px] flex-1">
                <span className="field-label">Name</span>
                <input
                  className="field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                />
              </label>
              {isCountry && (
                <label className="w-44">
                  <span className="field-label">Region</span>
                  <select
                    className="field"
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                  >
                    <option value="">—</option>
                    {REGIONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
              )}
              <button onClick={() => onSaveEdit(row)} disabled={busy} className="btn-primary !py-2.5">
                Save
              </button>
              <button onClick={() => setEditingId(null)} className="btn-outline !bg-white !py-2.5">
                Cancel
              </button>
              <p className="w-full text-xs text-ink-soft">
                The slug is rebuilt from the name, so renaming changes the public URL.
              </p>
            </div>
          ) : (
            <div key={row.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{row.name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  /{row.slug}
                  {isCountry && ` · ${row.region ?? 'no region'}`}
                </p>
              </div>
              <span className="shrink-0 text-xs text-ink-soft">
                {row.tripCount} trip{row.tripCount === 1 ? '' : 's'}
              </span>
              <button
                onClick={() => startEdit(row)}
                className="shrink-0 text-xs font-semibold text-teal-deep hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(row)}
                disabled={busy}
                className="shrink-0 text-xs font-semibold text-ink-soft hover:text-danger disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )
        )}
      </div>
    </>
  );
}
