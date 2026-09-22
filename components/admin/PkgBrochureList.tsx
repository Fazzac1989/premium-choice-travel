'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  archiveBrochure,
  createBrochure,
  deleteBrochure,
  duplicateBrochure,
  publishBrochure,
} from '@/lib/admin/package-brochure-actions';
import type { PackageBrochure } from '@/lib/package-brochure/schema';

/**
 * Brochure Studio: the list, and the form that starts a new one.
 *
 * A brochure is built from packages that are already published, because the
 * brochure reads their facts at render time — a draft package would print
 * whatever it happened to hold that afternoon.
 */

export type CataloguePackage = {
  id: number;
  title: string;
  destination: string | null;
  region: string | null;
  category: string | null;
  nights: number;
  rounds: number | null;
};

export default function PkgBrochureList({
  brand,
  brandName,
  brochures,
  pageCounts,
  catalogue,
  siteUrl,
}: {
  brand: string;
  brandName: string;
  brochures: PackageBrochure[];
  pageCounts: Record<number, number>;
  catalogue: CataloguePackage[];
  siteUrl: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [making, setMaking] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [search, setSearch] = useState('');

  const run = async (key: string, f: () => Promise<any>, ok?: string) => {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      const r = await f();
      if (r && r.ok === false) setError(r.error);
      else if (ok) setNote(ok);
      return r;
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  const q = search.trim().toLowerCase();
  const found = catalogue.filter(
    (p) => !q || `${p.title} ${p.destination ?? ''} ${p.region ?? ''} ${p.category ?? ''}`.toLowerCase().includes(q),
  );
  const toggle = (id: number) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = () =>
    run(
      'create',
      () => createBrochure({ brand, title, subtitle, packageIds: picked }),
      'Brochure created.',
    ).then((r) => {
      if (r?.ok) {
        setMaking(false);
        setTitle('');
        setSubtitle('');
        setPicked([]);
      }
    });

  return (
    <section className="mt-8">
      {note && <p className="card mb-4 p-3 text-sm text-teal-deep">{note}</p>}
      {error && <p className="card mb-4 p-3 text-sm text-danger">{error}</p>}

      {/* ── new brochure ─────────────────────────────────────────── */}
      {!making ? (
        <button type="button" className="btn btn-primary" onClick={() => setMaking(true)}>
          New brochure
        </button>
      ) : (
        <div className="card p-5">
          <h2 className="font-serif text-xl text-ink">New brochure</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Pick the journeys it should contain. Each one gets an introduction, its courses, a
            day-by-day and a why page — whichever of those it actually has something for.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Title</span>
              <input
                className="input mt-1 w-full"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Golf Holidays 2027"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Subtitle, on the cover</span>
              <input
                className="input mt-1 w-full"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder={brandName}
              />
            </label>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-ink-soft">
                {picked.length} of {catalogue.length} journeys chosen
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold text-teal-deep hover:underline"
                  onClick={() => setPicked(found.map((p) => p.id))}
                >
                  Select all {q ? 'shown' : ''}
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-ink-soft hover:underline"
                  onClick={() => setPicked([])}
                >
                  Clear
                </button>
              </div>
            </div>
            <input
              className="input mt-2 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search journeys, destinations or categories"
            />
            <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-line">
              {found.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 last:border-0 hover:bg-cream"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-teal"
                    checked={picked.includes(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.title}</span>
                    <span className="block text-xs text-ink-soft">
                      {[p.destination, p.category, `${p.nights} nights`, p.rounds ? `${p.rounds} rounds` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                </label>
              ))}
              {found.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-ink-soft">
                  No published journeys match that.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy !== null || !title.trim()}
              onClick={create}
            >
              {busy === 'create' ? 'Creating…' : 'Create brochure'}
            </button>
            <button type="button" className="btn" onClick={() => setMaking(false)} disabled={busy !== null}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── the brochures ────────────────────────────────────────── */}
      <div className="mt-6 grid gap-3">
        {brochures.map((b) => {
          const live = b.status === 'published';
          return (
            <div key={b.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[200px] flex-1">
                <Link
                  href={`/admin/brands/${brand}/brochures/${b.id}`}
                  className="font-serif text-lg text-ink hover:text-teal-deep"
                >
                  {b.title}
                </Link>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {[
                    `${b.packageIds.length} journey${b.packageIds.length === 1 ? '' : 's'}`,
                    `${pageCounts[b.id] ?? 0} pages`,
                    live ? 'Published' : 'Draft',
                    b.visibility === 'unlisted' ? 'Unlisted' : null,
                    `updated ${new Date(b.updatedAt).toLocaleDateString('en-GB')}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {live && (
                  <a
                    className="btn btn-sm"
                    href={`${siteUrl}/brochures/${b.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy !== null}
                  onClick={() =>
                    run(`pub-${b.id}`, () => publishBrochure(b.id, brand, !live), live ? 'Unpublished.' : 'Published.')
                  }
                >
                  {live ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy !== null}
                  onClick={() => run(`dup-${b.id}`, () => duplicateBrochure(b.id, brand), 'Duplicated.')}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={busy !== null}
                  onClick={() => run(`arch-${b.id}`, () => archiveBrochure(b.id, brand), 'Archived.')}
                >
                  Archive
                </button>
                <button
                  type="button"
                  className="btn btn-sm text-danger"
                  disabled={busy !== null}
                  onClick={() => {
                    // Deleting takes the pages with it and cannot be undone.
                    if (!confirm(`Delete “${b.title}” and all its pages? This cannot be undone.`)) return;
                    run(`del-${b.id}`, () => deleteBrochure(b.id, brand), 'Deleted.');
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {brochures.length === 0 && !making && (
          <p className="card p-8 text-center text-sm text-ink-soft">
            No brochures yet. Start one from your published journeys.
          </p>
        )}
      </div>
    </section>
  );
}
