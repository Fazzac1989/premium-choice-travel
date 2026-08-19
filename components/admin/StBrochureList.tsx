'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  createStBrochure,
  duplicateStBrochure,
  archiveStBrochure,
  type CreateInput,
} from '@/lib/admin/st-brochure-actions';
import type { Brochure, BrochureKind, DetailLevel } from '@/lib/brochure/schema';

export type PickerTrip = {
  id: number;
  title: string;
  status: string;
  subject: string | null;
  country: string | null;
  durationDays: number;
  heroImage: string | null;
};

type Named = { id: number; name: string };

const KINDS: { key: BrochureKind; label: string; blurb: string }[] = [
  { key: 'master', label: 'Master collection', blurb: 'Every published trip, grouped by subject.' },
  { key: 'subject', label: 'Subject', blurb: 'One or more curriculum areas.' },
  { key: 'destination', label: 'Destination', blurb: 'One or more countries.' },
  { key: 'custom', label: 'Custom', blurb: 'Hand-picked trips for one school.' },
];

const DETAIL: { key: DetailLevel; label: string; blurb: string }[] = [
  { key: 'inspiration', label: 'Inspiration', blurb: 'Shortest. Hero, proposition, four highlights.' },
  { key: 'standard', label: 'Standard', blurb: 'Recommended. Adds intro, learning focus, gallery.' },
  { key: 'detailed', label: 'Detailed', blurb: 'Adds a condensed day-by-day journey.' },
];

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-teal/15 text-teal-deep',
  draft: 'bg-ink/10 text-ink-soft',
  archived: 'bg-ink/5 text-ink-soft',
};

export default function StBrochureList({
  brochures,
  pageCounts,
  trips,
  subjects,
  countries,
  siteUrl,
}: {
  brochures: Brochure[];
  pageCounts: Record<string, number>;
  trips: PickerTrip[];
  subjects: Named[];
  countries: Named[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [wizard, setWizard] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function act(key: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(key);
    setError(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Something went wrong.');
    else router.refresh();
  }

  function share(slug: string) {
    const url = `${siteUrl}/brochures/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-soft">
          {brochures.length} brochure{brochures.length === 1 ? '' : 's'}
        </p>
        <button className="btn-primary !py-2.5" onClick={() => setWizard((w) => !w)}>
          {wizard ? 'Close' : '+ Create brochure'}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {wizard && (
        <CreateWizard
          trips={trips}
          subjects={subjects}
          countries={countries}
          onDone={(id) => {
            setWizard(false);
            router.push(`/admin/school-trips/brochures/${id}`);
          }}
        />
      )}

      {brochures.length === 0 ? (
        <p className="card mt-6 p-12 text-center text-sm text-ink-soft">
          No brochures yet. Create one from your published trips.
        </p>
      ) : (
        <div className="mt-6 grid gap-4">
          {brochures.map((b) => (
            <div key={b.id} className="card flex flex-wrap items-center gap-5 p-5">
              <div
                className="h-20 w-14 shrink-0 rounded-lg bg-sand bg-cover bg-center"
                style={b.coverImage ? { backgroundImage: `url(${b.coverImage})` } : undefined}
              />

              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/school-trips/brochures/${b.id}`}
                    className="font-serif text-xl text-ink hover:text-teal-deep"
                  >
                    {b.title}
                  </Link>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>
                    {b.status}
                  </span>
                  {b.visibility === 'unlisted' && (
                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                      unlisted
                    </span>
                  )}
                  {b.hasPassword && (
                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                      password
                    </span>
                  )}
                  {b.publishingMode === 'snapshot' && (
                    <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                      snapshot
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {b.clientName ? `${b.clientName} · ` : ''}
                  {b.tripIds.length} trip{b.tripIds.length === 1 ? '' : 's'} ·{' '}
                  {pageCounts[String(b.id)] ?? 0} pages · {b.detailLevel} ·{' '}
                  updated {new Date(b.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                <a
                  href={`${siteUrl}/brochures/${b.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-deep hover:underline"
                >
                  View ↗
                </a>
                <Link href={`/admin/school-trips/brochures/${b.id}`} className="text-teal-deep hover:underline">
                  Edit
                </Link>
                <button onClick={() => share(b.slug)} className="text-ink-soft hover:text-teal-deep">
                  {copied === b.slug ? 'Copied ✓' : 'Share'}
                </button>
                <button
                  disabled={busy !== null}
                  onClick={() => act(`dup-${b.id}`, () => duplicateStBrochure(b.id))}
                  className="text-ink-soft hover:text-teal-deep disabled:opacity-50"
                >
                  Duplicate
                </button>
                <button
                  disabled={busy !== null}
                  onClick={() => {
                    if (window.confirm(`Archive "${b.title}"? It stays available but leaves this list.`)) {
                      act(`arch-${b.id}`, () => archiveStBrochure(b.id));
                    }
                  }}
                  className="text-ink-soft hover:text-danger disabled:opacity-50"
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────── wizard ─────────────────────────────── */

function CreateWizard({
  trips,
  subjects,
  countries,
  onDone,
}: {
  trips: PickerTrip[];
  subjects: Named[];
  countries: Named[];
  onDone: (id: number) => void;
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<BrochureKind>('custom');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('standard');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [coverTheme, setCoverTheme] = useState<'light' | 'dark'>('dark');
  const [showSafety, setShowSafety] = useState(true);
  const [showApp, setShowApp] = useState(true);
  const [showItinerary, setShowItinerary] = useState(true);

  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterCountry, setFilterCountry] = useState('');

  const published = useMemo(() => trips.filter((t) => t.status === 'published'), [trips]);

  const visible = useMemo(
    () =>
      published.filter((t) => {
        if (search && !`${t.title} ${t.country ?? ''} ${t.subject ?? ''}`.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (filterSubject && t.subject !== filterSubject) return false;
        if (filterCountry && t.country !== filterCountry) return false;
        return true;
      }),
    [published, search, filterSubject, filterCountry]
  );

  // Selecting a kind pre-fills the obvious selection, which is most of the work
  // for a master or subject brochure.
  function chooseKind(next: BrochureKind) {
    setKind(next);
    if (next === 'master') {
      setSelected(published.map((t) => t.id));
      if (!title) setTitle('The Collection');
    } else if (next === 'custom') {
      setSelected([]);
    }
    setStep(2);
  }

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const move = (id: number, dir: -1 | 1) =>
    setSelected((s) => {
      const i = s.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s];
      next.splice(j, 0, next.splice(i, 1)[0]);
      return next;
    });

  const groupBy: 'subject' | 'country' | 'none' =
    kind === 'master' || kind === 'subject' ? 'subject' : kind === 'destination' ? 'country' : 'none';

  async function submit() {
    setBusy(true);
    setError(null);
    const payload: CreateInput = {
      title,
      subtitle,
      kind,
      detailLevel,
      tripIds: selected,
      subjectIds: subjects.filter((s) => selected.some((id) => published.find((t) => t.id === id)?.subject === s.name)).map((s) => s.id),
      countryIds: countries.filter((c) => selected.some((id) => published.find((t) => t.id === id)?.country === c.name)).map((c) => c.id),
      clientName,
      groupBy,
      showSafety,
      showApp,
      showItinerary,
      coverTheme,
    };
    const res = await createStBrochure(payload);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone(res.id!);
  }

  const stepLabel = ['Type', 'Trips', 'Details', 'Design'][step - 1];

  return (
    <div className="card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">
          Step {step} of 4 · {stepLabel}
        </p>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <span
              key={n}
              className={`h-1.5 w-10 rounded-full ${n <= step ? 'bg-teal' : 'bg-line'}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => chooseKind(k.key)}
              className={`rounded-2xl border p-5 text-left transition-colors ${
                kind === k.key ? 'border-teal bg-teal/5' : 'border-line hover:border-teal'
              }`}
            >
              <p className="font-serif text-lg text-ink">{k.label}</p>
              <p className="mt-1 text-xs text-ink-soft">{k.blurb}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <input
              className="field min-w-[200px] flex-1"
              placeholder="Search trips…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="field w-44" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </select>
            <select className="field w-44" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              className="btn-outline !bg-white !py-2.5"
              onClick={() => setSelected(visible.map((t) => t.id))}
            >
              Select all {visible.length}
            </button>
          </div>

          {selected.length > 0 && (
            <div className="mt-5 rounded-2xl bg-sand p-4">
              <p className="field-label">Running order — {selected.length} selected</p>
              <ol className="grid gap-1.5">
                {selected.map((id, i) => {
                  const t = published.find((x) => x.id === id);
                  if (!t) return null;
                  return (
                    <li key={id} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-right text-xs text-ink-soft">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
                      <button onClick={() => move(id, -1)} disabled={i === 0} className="text-xs text-ink-soft hover:text-teal-deep disabled:opacity-30">↑</button>
                      <button onClick={() => move(id, 1)} disabled={i === selected.length - 1} className="text-xs text-ink-soft hover:text-teal-deep disabled:opacity-30">↓</button>
                      <button onClick={() => toggle(id)} className="text-xs text-ink-soft hover:text-danger">✕</button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="mt-5 grid max-h-96 gap-2 overflow-y-auto pr-1">
            {visible.map((t) => {
              const on = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={`flex items-center gap-4 rounded-xl border p-3 text-left transition-colors ${
                    on ? 'border-teal bg-teal/5' : 'border-line hover:border-teal'
                  }`}
                >
                  <span
                    className="h-11 w-16 shrink-0 rounded-lg bg-sand bg-cover bg-center"
                    style={t.heroImage ? { backgroundImage: `url(${t.heroImage})` } : undefined}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{t.title}</span>
                    <span className="block text-xs text-ink-soft">
                      {t.subject ?? '—'} · {t.country ?? '—'} · {t.durationDays} days
                    </span>
                  </span>
                  <span className={`text-xs font-semibold ${on ? 'text-teal-deep' : 'text-ink-soft'}`}>
                    {on ? 'Selected' : 'Add'}
                  </span>
                </button>
              );
            })}
            {visible.length === 0 && <p className="p-6 text-center text-sm text-ink-soft">No trips match.</p>}
          </div>
        </>
      )}

      {step === 3 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="field-label">Brochure title</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2027 Educational Travel" />
          </label>
          <label>
            <span className="field-label">Subtitle</span>
            <input className="field" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="The world is your classroom" />
          </label>
          <label className="sm:col-span-2">
            <span className="field-label">Prepared for (optional school or client)</span>
            <input className="field" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Dubai British School" />
          </label>
          <div className="sm:col-span-2">
            <span className="field-label">Detail level</span>
            <div className="grid gap-3 sm:grid-cols-3">
              {DETAIL.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDetailLevel(d.key)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    detailLevel === d.key ? 'border-teal bg-teal/5' : 'border-line hover:border-teal'
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{d.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{d.blurb}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 grid gap-5">
          <div>
            <span className="field-label">Cover</span>
            <div className="flex gap-3">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCoverTheme(t)}
                  className={`rounded-xl border px-5 py-3 text-sm font-semibold capitalize transition-colors ${
                    coverTheme === t ? 'border-teal bg-teal/5 text-teal-deep' : 'border-line text-ink-soft hover:border-teal'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <span className="field-label">Include</span>
            {[
              ['Health & safety page', showSafety, setShowSafety],
              ['Our technology page', showApp, setShowApp],
              ['Day-by-day journey pages', showItinerary, setShowItinerary],
            ].map(([label, value, set]) => (
              <label key={label as string} className="flex items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) => (set as (v: boolean) => void)(e.target.checked)}
                  className="h-4 w-4 accent-teal"
                />
                {label as string}
              </label>
            ))}
          </div>

          <p className="text-xs text-ink-soft">
            {selected.length} trip{selected.length === 1 ? '' : 's'} ·{' '}
            {groupBy === 'none' ? 'no dividers' : `grouped by ${groupBy}`} · {detailLevel} detail.
            Copy is written in the next step, and nothing publishes until you say so.
          </p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
        {step > 1 && (
          <button className="btn-outline !bg-white !py-2.5" onClick={() => setStep(step - 1)} disabled={busy}>
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            className="btn-primary !py-2.5"
            disabled={step === 2 && selected.length === 0}
            onClick={() => setStep(step + 1)}
          >
            Continue
          </button>
        ) : (
          <button className="btn-primary !py-2.5" onClick={submit} disabled={busy || !title.trim() || !selected.length}>
            {busy ? 'Building…' : 'Create brochure'}
          </button>
        )}
        <span className="text-xs text-ink-soft">
          {selected.length} trip{selected.length === 1 ? '' : 's'} selected
        </span>
      </div>
    </div>
  );
}
