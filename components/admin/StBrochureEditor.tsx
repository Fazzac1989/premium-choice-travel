'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  composeStBrochure,
  publishStBrochure,
  recomposeStTrip,
  setStBrochurePassword,
  updateStBrochure,
  updateStBrochurePage,
} from '@/lib/admin/st-brochure-actions';
import {
  PAGE_LABELS,
  type Brochure,
  type BrochurePage,
  type PageContent,
} from '@/lib/brochure/schema';
import type { TripWarning } from '@/lib/brochure/build';
import StBrochureContents from '@/components/admin/StBrochureContents';

/** What each row of copy is, in the reader's terms rather than the template's. */
const COPY_LABELS: Record<string, string> = {
  tripHero: 'Introduction — headline and proposition',
  tripOverview: 'Overview',
  tripHighlights: 'Highlights',
  tripItinerary: 'Journey',
  tripGallery: 'Photographs',
  cover: 'Cover text',
  contact: 'Closing page',
  callToAction: 'Closing page',
};

const COPY_STYLE: Record<string, string> = {
  ai: 'bg-ink/10 text-ink-soft',
  reviewed: 'bg-teal/15 text-teal-deep',
  approved: 'bg-teal text-white',
};

export default function StBrochureEditor({
  brochure,
  pages,
  tripTitles,
  trips,
  warnings,
  siteUrl,
}: {
  brochure: Brochure;
  pages: BrochurePage[];
  tripTitles: Record<string, string>;
  trips: { id: number; title: string; days: number }[];
  warnings: TripWarning[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [tab, setTab] = useState<'pages' | 'settings'>('pages');

  const url = `${siteUrl}/brochures/${brochure.slug}`;
  const composed = pages.some((p) => p.content?.headline);

  // The rows the deck actually reads: a trip's copy, the cover text and the
  // closing page. Contents, dividers, the safety and technology pages have
  // rows too, but the deck draws those itself, so they are not offered here.
  const copyRows = pages.filter(
    (p) => p.tripId || p.pageType === 'cover' || p.pageType === 'contact' || p.pageType === 'callToAction',
  );
  const copyLabel = (p: BrochurePage) => {
    const what = COPY_LABELS[p.pageType] ?? PAGE_LABELS[p.pageType];
    return p.tripId ? `${tripTitles[p.tripId] ?? 'Trip'} — ${what}` : what;
  };

  async function run(key: string, fn: () => Promise<any>, success?: string) {
    setBusy(key);
    setError(null);
    setNote(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) return setError(res.error ?? 'Something went wrong.');
    if (res.flags?.length) setFlags(res.flags);
    if (success) setNote(success);
    router.refresh();
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">
            {brochure.kind} · {brochure.detailLevel} · {brochure.publishingMode}
          </p>
          <h1 className="font-serif text-3xl text-ink">{brochure.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {brochure.clientName ? `Prepared for ${brochure.clientName} · ` : ''}
            {brochure.tripIds.length} trips · {pages.length} pages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-outline !bg-white !py-2.5"
            disabled={busy !== null}
            onClick={() => run('compose', () => composeStBrochure(brochure.id), 'Copy written — review it below.')}
          >
            {busy === 'compose' ? 'Writing copy…' : composed ? 'Rewrite all copy' : '✨ Compose with AI'}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="btn-outline !bg-white !py-2.5">
            Preview ↗
          </a>
          <button
            className="btn-primary !py-2.5"
            disabled={busy !== null}
            onClick={() =>
              run(
                'publish',
                () => publishStBrochure(brochure.id, brochure.status !== 'published'),
                brochure.status === 'published' ? 'Unpublished.' : 'Published.'
              )
            }
          >
            {brochure.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </div>
      </div>

      {brochure.status === 'published' && (
        <div className="card mt-6 flex flex-wrap items-center gap-3 p-4">
          <span className="field-label !mb-0">Share link</span>
          <code className="min-w-0 flex-1 truncate rounded-lg bg-sand px-3 py-2 text-xs">{url}</code>
          <button className="btn-outline !px-4 !py-2 text-xs" onClick={() => navigator.clipboard.writeText(url)}>
            Copy link
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {note && <p className="mt-4 text-sm font-semibold text-teal-deep">{note}</p>}

      {flags.length > 0 && (
        <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 p-5">
          <p className="text-sm font-semibold text-danger">Check these before publishing</p>
          <ul className="mt-2 grid gap-1 text-sm text-ink-soft">
            {flags.map((f, i) => (
              <li key={i}>· {f}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            These are things the copy says that could not be traced back to the trip&apos;s own text.
          </p>
        </div>
      )}

      {warnings.length > 0 && (
        <details className="card mt-6 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            {warnings.length} trip{warnings.length === 1 ? '' : 's'} with content warnings
          </summary>
          <ul className="mt-3 grid gap-3 text-sm">
            {warnings.map((w) => (
              <li key={w.tripId}>
                <p className="font-semibold text-ink">{w.title}</p>
                <ul className="mt-0.5 text-ink-soft">
                  {w.issues.map((i, n) => (
                    <li key={n}>⚠ {i}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-soft">
            None of these stop you publishing — they are what a reader might notice.
          </p>
        </details>
      )}

      <div className="mt-8 flex gap-6 border-b border-line">
        {(['pages', 'settings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'border-teal text-teal-deep' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'pages' ? (
        <div className="mt-6 grid gap-8">
          <StBrochureContents brochure={brochure} pages={pages} trips={trips} run={run} busy={busy} />

          <section>
            <h2 className="font-serif text-xl text-ink">The copy, page by page</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Each trip&apos;s pages are written from these. Reorder or hide trips above; edit their
              words here.
            </p>
            <div className="mt-4 grid gap-2">
              {copyRows.map((page) => (
                <div key={page.id} className={`card ${page.hidden ? 'opacity-50' : ''}`}>
                  <div className="flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-semibold text-ink">{copyLabel(page)}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {page.content?.headline ||
                          (page.content?.proposition ? `${page.content.proposition.slice(0, 80)}…` : 'No copy yet')}
                        {page.hidden ? ' · hidden' : ''}
                      </p>
                    </div>

                    {page.tripId && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${COPY_STYLE[page.copyStatus]}`}>
                        {page.copyStatus}
                      </span>
                    )}

                    <button
                      onClick={() => setOpen(open === page.id ? null : page.id)}
                      className="text-xs font-semibold text-teal-deep hover:underline"
                    >
                      {open === page.id ? 'Close' : 'Edit'}
                    </button>
                  </div>

                  {open === page.id && (
                    <PageEditor
                      page={page}
                      busy={busy !== null}
                      onSave={(content) =>
                        run(`save-${page.id}`, () => updateStBrochurePage(page.id, { content }), 'Saved.')
                      }
                      onApprove={() =>
                        run(`ok-${page.id}`, () => updateStBrochurePage(page.id, { copyStatus: 'approved' }), 'Approved.')
                      }
                      onRecompose={
                        page.tripId
                          ? () => run(`re-${page.id}`, () => recomposeStTrip(brochure.id, page.tripId!), 'Rewritten.')
                          : undefined
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <Settings brochure={brochure} busy={busy !== null} run={run} />
      )}
    </>
  );
}

/* ─────────────────────────── page copy editor ─────────────────────────── */

function PageEditor({
  page,
  busy,
  onSave,
  onApprove,
  onRecompose,
}: {
  page: BrochurePage;
  busy: boolean;
  onSave: (content: PageContent) => void;
  onApprove: () => void;
  onRecompose?: () => void;
}) {
  const [c, setC] = useState<PageContent>(page.content ?? {});
  const set = (k: keyof PageContent, v: any) => setC((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="grid gap-4 border-t border-line bg-sand p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Headline</span>
          <input className="field" value={c.headline ?? ''} onChange={(e) => set('headline', e.target.value)} />
        </label>
        <label>
          <span className="field-label">Subheadline</span>
          <input className="field" value={c.subheadline ?? ''} onChange={(e) => set('subheadline', e.target.value)} />
        </label>
      </div>

      <label>
        <span className="field-label">Proposition — one line</span>
        <input className="field" value={c.proposition ?? ''} onChange={(e) => set('proposition', e.target.value)} />
      </label>

      <label>
        <span className="field-label">Introduction</span>
        <textarea rows={3} className="field" value={c.intro ?? ''} onChange={(e) => set('intro', e.target.value)} />
      </label>

      {(c.highlights ?? []).length > 0 && (
        <div>
          <span className="field-label">Highlights</span>
          <div className="grid gap-2">
            {(c.highlights ?? []).map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="field w-44"
                  value={h.name}
                  onChange={(e) => {
                    const next = [...(c.highlights ?? [])];
                    next[i] = { ...h, name: e.target.value };
                    set('highlights', next);
                  }}
                />
                <input
                  className="field flex-1"
                  value={h.note}
                  onChange={(e) => {
                    const next = [...(c.highlights ?? [])];
                    next[i] = { ...h, note: e.target.value };
                    set('highlights', next);
                  }}
                />
                <button
                  className="rounded-lg border border-line px-3 text-xs font-semibold text-ink-soft hover:text-danger"
                  onClick={() => set('highlights', (c.highlights ?? []).filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(c.conditions ?? []).length > 0 && (
        <div className="rounded-xl border border-line bg-white p-3">
          <span className="field-label">Conditions carried from the trip</span>
          <ul className="grid gap-1 text-xs text-ink-soft">
            {(c.conditions ?? []).map((t, i) => (
              <li key={i}>· {t}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-ink-soft">
            These print in the brochure. Removing one removes a caveat the operator wrote.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary !py-2.5" disabled={busy} onClick={() => onSave(c)}>
          Save copy
        </button>
        <button className="btn-outline !bg-white !py-2.5" disabled={busy} onClick={onApprove}>
          Mark approved
        </button>
        {onRecompose && (
          <button className="btn-outline !bg-white !py-2.5" disabled={busy} onClick={onRecompose}>
            Rewrite with AI
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────────  settings ─────────────────────────────── */

function Settings({
  brochure,
  busy,
  run,
}: {
  brochure: Brochure;
  busy: boolean;
  run: (key: string, fn: () => Promise<any>, success?: string) => void;
}) {
  const [title, setTitle] = useState(brochure.title);
  const [subtitle, setSubtitle] = useState(brochure.subtitle ?? '');
  const [slug, setSlug] = useState(brochure.slug);
  const [clientName, setClientName] = useState(brochure.clientName ?? '');
  const [intro, setIntro] = useState(brochure.introText ?? '');
  const [visibility, setVisibility] = useState(brochure.visibility);
  const [mode, setMode] = useState(brochure.publishingMode);
  const [password, setPassword] = useState('');

  return (
    <div className="card mt-6 grid gap-5 p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Title</span>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Subtitle</span>
          <input className="field" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </label>
        <label>
          <span className="field-label">URL slug</span>
          <input className="field" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Prepared for</span>
          <input className="field" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </label>
      </div>

      <label>
        <span className="field-label">Introduction (replaces the standard opening)</span>
        <textarea rows={3} className="field" value={intro} onChange={(e) => setIntro(e.target.value)} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="field-label">Visibility</span>
          <select className="field" value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
            <option value="unlisted">Unlisted — reachable by link only, never indexed</option>
            <option value="public">Public — may be listed and indexed</option>
          </select>
        </label>
        <label>
          <span className="field-label">Content mode</span>
          <select className="field" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="live">Live — follows the trips as they change</option>
            <option value="snapshot">Snapshot — frozen at publish</option>
          </select>
        </label>
      </div>

      <button
        className="btn-primary !py-2.5 justify-self-start"
        disabled={busy}
        onClick={() =>
          run(
            'settings',
            () =>
              updateStBrochure(brochure.id, {
                title,
                subtitle,
                slug,
                clientName,
                introText: intro,
                visibility,
                publishingMode: mode,
              }),
            'Settings saved.'
          )
        }
      >
        Save settings
      </button>

      <div className="border-t border-line pt-5">
        <span className="field-label">Password protection</span>
        <p className="mb-3 text-xs text-ink-soft">
          For bespoke proposals. Only a hash is stored, and it is checked on the server.
          {brochure.hasPassword ? ' This brochure currently has a password.' : ''}
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            className="field w-64"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={brochure.hasPassword ? 'New password' : 'Set a password'}
          />
          <button
            className="btn-outline !bg-white !py-2.5"
            disabled={busy}
            onClick={() =>
              run('pw', () => setStBrochurePassword(brochure.id, password), password ? 'Password set.' : 'Password removed.')
            }
          >
            {password ? 'Set password' : 'Remove password'}
          </button>
        </div>
      </div>
    </div>
  );
}
