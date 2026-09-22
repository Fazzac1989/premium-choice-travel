'use client';

import { useState } from 'react';
import {
  addPackages,
  movePackage,
  publishBrochure,
  removePackage,
  setPageHidden,
  updateBrochure,
  updateBrochureDesign,
} from '@/lib/admin/package-brochure-actions';
import type { PackageBrochure, PackageBrochurePage } from '@/lib/package-brochure/schema';
import { PAGE_LABELS } from '@/lib/package-brochure/schema';
import type { CataloguePackage } from '@/components/admin/PkgBrochureList';

/**
 * What the brochure contains, in the order a reader meets it.
 *
 * The stored rows do not map one-to-one onto what a reader sees — a journey
 * has several rows and the cover has one — so this list is the deck, not the
 * table. Journeys move and come out as a whole run; individual pages switch
 * off; the cover and document pick their themes. Every change saves as it is
 * made.
 */

type PackageInfo = {
  id: number;
  title: string;
  destination: string | null;
  region: string | null;
  nights: number;
  rounds: number | null;
  courses: number;
  days: number;
  hasWhy: boolean;
};

export default function PkgBrochureEditor({
  brand,
  brochure,
  pages,
  packages,
  catalogue,
  siteUrl,
}: {
  brand: string;
  brochure: PackageBrochure;
  pages: PackageBrochurePage[];
  packages: PackageInfo[];
  catalogue: CataloguePackage[];
  siteUrl: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [picked, setPicked] = useState<number[]>([]);
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState(brochure.title);
  const [subtitle, setSubtitle] = useState(brochure.subtitle ?? '');
  const [intro, setIntro] = useState(brochure.introText ?? '');
  const [closing, setClosing] = useState(brochure.closingText ?? '');

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

  const d = brochure.design;
  const on = (v: boolean | undefined) => v !== false;
  const live = brochure.status === 'published';

  // Journeys in the order their first page appears — the order the deck uses.
  const order: number[] = [];
  for (const p of pages) if (p.packageId && !order.includes(p.packageId)) order.push(p.packageId);
  const info = (id: number) => packages.find((p) => p.id === id);
  const pagesOf = (id: number) => pages.filter((p) => p.packageId === id);

  const inBrochure = new Set(order);
  const q = search.trim().toLowerCase();
  const available = catalogue.filter(
    (p) =>
      !inBrochure.has(p.id) &&
      (!q || `${p.title} ${p.destination ?? ''} ${p.category ?? ''}`.toLowerCase().includes(q)),
  );

  const setDesign = (patch: Record<string, unknown>, msg: string) =>
    run('design', () => updateBrochureDesign(brochure.id, brand, patch), msg);

  const saveText = () =>
    run(
      'text',
      () => updateBrochure(brochure.id, brand, { title, subtitle, introText: intro, closingText: closing }),
      'Saved.',
    );

  // Page numbers as the deck will show them.
  let n = 0;
  const num = (count = 1) => {
    const first = ++n;
    n += count - 1;
    return count === 1
      ? String(first).padStart(2, '0')
      : `${String(first).padStart(2, '0')}–${String(n).padStart(2, '0')}`;
  };

  const Row = ({
    number,
    title: rowTitle,
    detail,
    right,
    muted,
  }: {
    number: string;
    title: string;
    detail?: string;
    right?: React.ReactNode;
    muted?: boolean;
  }) => (
    <div className={`card flex flex-wrap items-center gap-4 p-4 ${muted ? 'opacity-50' : ''}`}>
      <span className="w-12 text-right text-xs tabular-nums text-ink-soft">{number}</span>
      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-semibold text-ink">{rowTitle}</p>
        {detail && <p className="mt-0.5 text-xs text-ink-soft">{detail}</p>}
      </div>
      {right}
    </div>
  );

  const Choice = ({
    options,
    value,
    onPick,
  }: {
    options: [string, string][];
    value: string;
    onPick: (v: string) => void;
  }) => (
    <div className="flex gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          disabled={busy !== null}
          onClick={() => onPick(v)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === v ? 'border-teal bg-teal/5 text-teal-deep' : 'border-line text-ink-soft hover:border-teal'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="mt-6 grid gap-8">
      {note && <p className="card p-3 text-sm text-teal-deep">{note}</p>}
      {error && <p className="card p-3 text-sm text-danger">{error}</p>}

      {/* ── status ───────────────────────────────────────────────── */}
      <section className="card flex flex-wrap items-center gap-4 p-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">{live ? 'Published' : 'Draft'}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {live ? `Readable at ${siteUrl}/brochures/${brochure.slug}` : 'Not readable by anyone yet.'}
          </p>
        </div>
        {live && (
          <>
            <a className="btn btn-sm" href={`${siteUrl}/brochures/${brochure.slug}`} target="_blank" rel="noopener noreferrer">
              View
            </a>
            <a className="btn btn-sm" href={`/api/brochures/${brochure.slug}/pdf`} target="_blank" rel="noopener noreferrer">
              Download PDF
            </a>
          </>
        )}
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={busy !== null}
          onClick={() =>
            run('publish', () => publishBrochure(brochure.id, brand, !live), live ? 'Unpublished.' : 'Published.')
          }
        >
          {live ? 'Unpublish' : 'Publish'}
        </button>
      </section>

      {/* ── words ────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl text-ink">Cover and closing</h2>
        <p className="mt-1 text-sm text-ink-soft">
          The only words written by hand. Everything else comes from the journeys themselves.
        </p>
        <div className="mt-3 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Title</span>
              <input className="input mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-soft">Subtitle</span>
              <input className="input mt-1 w-full" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft">Cover line</span>
            <textarea
              className="input mt-1 w-full"
              rows={2}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="One line under the title on the cover."
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-soft">Closing page</span>
            <textarea
              className="input mt-1 w-full"
              rows={2}
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              placeholder="What you want a reader to do next. Leave empty to drop the closing page."
            />
          </label>
          <div>
            <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={saveText}>
              {busy === 'text' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </section>

      {/* ── contents ─────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-ink">What the brochure contains</h2>
            <p className="mt-1 text-sm text-ink-soft">
              In reading order, as the PDF will print. Journeys move and come out as a whole; changes
              save as you make them.
            </p>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setShowPicker((s) => !s)}>
            {showPicker ? 'Done adding' : 'Add journeys'}
          </button>
        </div>

        {showPicker && (
          <div className="card mt-3 p-4">
            <input
              className="input w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the catalogue"
            />
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line">
              {available.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 last:border-0 hover:bg-cream"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-teal"
                    checked={picked.includes(p.id)}
                    onChange={() =>
                      setPicked((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{p.title}</span>
                    <span className="block text-xs text-ink-soft">
                      {[p.destination, p.category, `${p.nights} nights`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </label>
              ))}
              {available.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-ink-soft">
                  Every published journey is already in this brochure.
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary mt-3"
              disabled={busy !== null || picked.length === 0}
              onClick={() =>
                run(
                  'add',
                  () => addPackages(brochure.id, brand, picked),
                  `${picked.length} journey${picked.length === 1 ? '' : 's'} added.`,
                ).then((r) => {
                  if (r?.ok) {
                    setPicked([]);
                    setShowPicker(false);
                  }
                })
              }
            >
              Add {picked.length || ''}
            </button>
          </div>
        )}

        <div className="mt-3 grid gap-2">
          <Row number={num()} title="Cover" detail={`${brochure.title}${subtitle ? ` · ${subtitle}` : ''}`} />

          <Row
            number="—"
            title="Cover colour"
            detail={d.coverTheme === 'light' ? 'Light: cream cover' : 'Dark: navy cover'}
            right={
              <Choice
                options={[
                  ['dark', 'Dark'],
                  ['light', 'Light'],
                ]}
                value={d.coverTheme === 'light' ? 'light' : 'dark'}
                onPick={(v) => setDesign({ coverTheme: v }, `Cover set to ${v}.`)}
              />
            }
          />
          <Row
            number="—"
            title="Every page after the cover"
            detail={d.documentTheme === 'dark' ? 'Dark: navy throughout' : 'Light: white pages'}
            right={
              <Choice
                options={[
                  ['light', 'Light'],
                  ['dark', 'Dark'],
                ]}
                value={d.documentTheme === 'dark' ? 'dark' : 'light'}
                onPick={(v) => setDesign({ documentTheme: v }, `Document set to ${v}.`)}
              />
            }
          />

          {order.length > 0 && (
            <Row number={num()} title="Contents" detail={`${order.length} journeys, with thumbnails`} />
          )}

          {order.map((id, i) => {
            const p = info(id);
            const rows = pagesOf(id);
            const shown = rows.filter((r) => !r.hidden);
            return (
              <Row
                key={id}
                number={num(shown.length)}
                title={p?.title ?? `Journey ${id}`}
                muted={shown.length === 0}
                detail={[
                  p?.destination,
                  p?.nights ? `${p.nights} nights` : null,
                  p?.rounds ? `${p.rounds} rounds` : null,
                  rows.map((r) => PAGE_LABELS[r.pageType] ?? r.pageType).join(', '),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <div className="flex flex-wrap items-center gap-1">
                    {rows.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        disabled={busy !== null}
                        title={`${r.hidden ? 'Show' : 'Hide'} the ${PAGE_LABELS[r.pageType] ?? r.pageType} page`}
                        onClick={() =>
                          run(
                            `page-${r.id}`,
                            () => setPageHidden(r.id, brochure.id, brand, !r.hidden),
                            r.hidden ? 'Page shown.' : 'Page hidden.',
                          )
                        }
                        className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                          r.hidden
                            ? 'border-line text-ink-soft line-through hover:border-teal'
                            : 'border-teal bg-teal/5 text-teal-deep'
                        }`}
                      >
                        {(PAGE_LABELS[r.pageType] ?? r.pageType).replace('Why this destination', 'Why')}
                      </button>
                    ))}
                    <span className="mx-1 h-5 w-px bg-line" />
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy !== null || i === 0}
                      onClick={() => run(`up-${id}`, () => movePackage(brochure.id, brand, id, -1))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy !== null || i === order.length - 1}
                      onClick={() => run(`down-${id}`, () => movePackage(brochure.id, brand, id, 1))}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm text-danger"
                      disabled={busy !== null}
                      onClick={() => {
                        if (!confirm(`Take “${p?.title ?? 'this journey'}” out of the brochure?`)) return;
                        run(`rm-${id}`, () => removePackage(brochure.id, brand, id), 'Journey removed.');
                      }}
                    >
                      Remove
                    </button>
                  </div>
                }
              />
            );
          })}

          {closing.trim() && <Row number={num()} title="Closing" detail="Talk to us" />}
        </div>

        {order.length === 0 && (
          <p className="card mt-3 p-8 text-center text-sm text-ink-soft">
            No journeys in this brochure yet.
          </p>
        )}
      </section>

      {/* ── which pages a journey gets ───────────────────────────── */}
      <section>
        <h2 className="font-serif text-xl text-ink">Pages every journey gets</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Turning one off here drops it from every journey. A journey with nothing to put on a page
          never gets one in the first place.
        </p>
        <div className="mt-3 grid gap-2">
          <Row
            number="—"
            title="The courses"
            detail={`${packages.filter((p) => p.courses > 0).length} of ${packages.length} journeys have course notes`}
            right={
              <Choice
                options={[
                  ['on', 'Include'],
                  ['off', 'Leave out'],
                ]}
                value={on(d.showCourses) ? 'on' : 'off'}
                onPick={(v) => setDesign({ showCourses: v === 'on' }, `Courses pages ${v === 'on' ? 'on' : 'off'}.`)}
              />
            }
          />
          <Row
            number="—"
            title="Day by day"
            detail={`${packages.filter((p) => p.days > 0).length} of ${packages.length} journeys have an itinerary`}
            right={
              <Choice
                options={[
                  ['on', 'Include'],
                  ['off', 'Leave out'],
                ]}
                value={on(d.showItinerary) ? 'on' : 'off'}
                onPick={(v) => setDesign({ showItinerary: v === 'on' }, `Itinerary pages ${v === 'on' ? 'on' : 'off'}.`)}
              />
            }
          />
          <Row
            number="—"
            title="Why this destination"
            detail={`${packages.filter((p) => p.hasWhy).length} of ${packages.length} journeys have something to say`}
            right={
              <Choice
                options={[
                  ['on', 'Include'],
                  ['off', 'Leave out'],
                ]}
                value={on(d.showWhy) ? 'on' : 'off'}
                onPick={(v) => setDesign({ showWhy: v === 'on' }, `Why pages ${v === 'on' ? 'on' : 'off'}.`)}
              />
            }
          />
        </div>
      </section>
    </div>
  );
}
