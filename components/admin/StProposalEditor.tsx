'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  addStProposalDay,
  archiveStProposal,
  deleteStProposalDay,
  issueStProposalLink,
  moveStProposalDay,
  revokeStProposalLink,
  saveStProposalDay,
  saveStProposalDayItems,
  saveStProposalFlights,
  sendStProposalEmail,
  setStProposalStatus,
  updateStProposalCommercials,
  updateStProposalContent,
} from '@/lib/admin/st-proposal-actions';
import type { ProposalContent } from '@/lib/brochure/proposal-schema';

type Day = {
  id: number;
  dayNumber: number;
  date: string | null;
  title: string;
  summary: string;
  overnight: string;
  imageIds: number[];
  sortOrder: number;
  items: { id: number; timeLabel: string; text: string; sortOrder: number }[];
};

type Flight = {
  id: number;
  direction: 'outbound' | 'return';
  flightNumber: string;
  carrier: string;
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  departsAt: string | null;
  arrivesAt: string | null;
  note: string;
  sortOrder: number;
};

type Proposal = {
  id: number;
  title: string;
  status: string;
  content: ProposalContent;
  commercials: {
    preparedFor: string;
    travelStart: string | null;
    travelEnd: string | null;
    studentCount: number | null;
    freePlacesTeachers: number | null;
    freePlacesPctStaff: number | null;
    pricePerStudent: number | null;
    currency: string;
    priceBasisNote: string;
  };
  heroEffect: boolean;
  termsSetId: number | null;
  shareToken: string | null;
  shareExpiresAt: string | null;
  viewCount: number;
  pdfGeneratedAt: string | null;
  updatedAt: string | null;
};

type ProposalEvent = {
  id: number;
  event: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const TABS = ['Document', 'Itinerary', 'Flights', 'Price', 'Share'] as const;
type Tab = (typeof TABS)[number];

export default function StProposalEditor({
  proposal,
  days,
  flights,
  images,
  termsSets,
  events,
  previewToken,
  siteUrl,
}: {
  proposal: Proposal;
  days: Day[];
  flights: Flight[];
  images: { id: number; alt: string; url: string }[];
  termsSets: { id: number; name: string; version: number; isDefault: boolean }[];
  events: ProposalEvent[];
  previewToken: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Document');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<any>, success?: string) {
    setBusy(key);
    setError(null);
    setNote(null);
    const res = await fn();
    setBusy(null);
    if (!res?.ok) return setError(res?.error ?? 'Something went wrong.');
    if (success) setNote(success);
    router.refresh();
    return res;
  }

  const previewUrl = `${siteUrl}/proposals/${proposal.id}?preview=${encodeURIComponent(previewToken)}`;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">
            {proposal.status}
            {proposal.commercials.preparedFor ? ` · ${proposal.commercials.preparedFor}` : ''}
          </p>
          <h1 className="font-serif text-3xl text-ink">{proposal.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {days.length} days · {flights.length} flights
            {proposal.viewCount ? ` · ${proposal.viewCount} views` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a href={previewUrl} target="_blank" rel="noreferrer" className="btn-outline !bg-white !py-2.5">
            Preview ↗
          </a>
          <button
            className="btn-outline !bg-white !py-2.5"
            disabled={busy !== null}
            onClick={() =>
              run('archive', () => archiveStProposal(proposal.id), 'Archived.').then(
                () => router.push('/admin/school-trips/proposals'),
              )
            }
          >
            Archive
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {note && <p className="mt-4 rounded-xl bg-teal/10 px-4 py-3 text-sm text-teal-deep">{note}</p>}

      <div className="mt-6 flex flex-wrap gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t
                ? 'border-teal text-teal-deep'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Document' && (
          <DocumentTab proposal={proposal} images={images} run={run} busy={busy} />
        )}
        {tab === 'Itinerary' && (
          <ItineraryTab proposal={proposal} days={days} images={images} run={run} busy={busy} />
        )}
        {tab === 'Flights' && <FlightsTab proposal={proposal} flights={flights} run={run} busy={busy} />}
        {tab === 'Price' && (
          <PriceTab proposal={proposal} termsSets={termsSets} run={run} busy={busy} />
        )}
        {tab === 'Share' && (
          <ShareTab proposal={proposal} events={events} siteUrl={siteUrl} run={run} busy={busy} />
        )}
      </div>
    </>
  );
}

/* ──────────────────────────────── document ──────────────────────────────── */

function DocumentTab({
  proposal,
  images,
  run,
  busy,
}: {
  proposal: Proposal;
  images: { id: number; alt: string; url: string }[];
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const c = proposal.content;
  const [form, setForm] = useState({
    title: c.title,
    titleEmphasis: c.titleEmphasis,
    eyebrow: c.eyebrow,
    subtitle: c.subtitle,
    intro: c.intro.join('\n\n'),
    overviewHeading: c.overviewHeading,
    overviewEmphasis: c.overviewEmphasis,
    pctParents: c.pctParents,
    pctChildren: c.pctChildren,
    pctTeachers: c.pctTeachers,
    inclusions: c.inclusions.join('\n'),
    exclusions: c.exclusions.join('\n'),
    heroImageId: c.heroImageId,
  });

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    run(
      'doc',
      () =>
        updateStProposalContent(proposal.id, {
          title: form.title,
          titleEmphasis: form.titleEmphasis,
          eyebrow: form.eyebrow,
          subtitle: form.subtitle,
          // Blank lines separate paragraphs, which is how the copy is written.
          intro: form.intro.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
          overviewHeading: form.overviewHeading,
          overviewEmphasis: form.overviewEmphasis,
          pctParents: form.pctParents,
          pctChildren: form.pctChildren,
          pctTeachers: form.pctTeachers,
          inclusions: form.inclusions.split('\n').map((s) => s.trim()).filter(Boolean),
          exclusions: form.exclusions.split('\n').map((s) => s.trim()).filter(Boolean),
          heroImageId: form.heroImageId,
        }),
      'Document saved.',
    );

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">The opening</h2>
        <div className="mt-4 grid gap-4">
          <div>
            <label className="field-label">Small line above the headline</label>
            <input className="field" value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Headline</label>
              <input className="field" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Headline, italic part</label>
              <input
                className="field"
                value={form.titleEmphasis}
                onChange={(e) => set('titleEmphasis', e.target.value)}
              />
              <p className="mt-1 text-xs text-ink-soft">Shown in italics on the second line.</p>
            </div>
          </div>
          <div>
            <label className="field-label">Standfirst</label>
            <textarea
              className="field min-h-[80px]"
              value={form.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Hero image</label>
            <select
              className="field"
              value={form.heroImageId ?? ''}
              onChange={(e) => set('heroImageId', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No hero image</option>
              {images.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.alt || `Image ${i.id}`}
                </option>
              ))}
            </select>
            {form.heroImageId && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={images.find((i) => i.id === form.heroImageId)?.url}
                alt=""
                className="mt-3 h-40 w-full rounded-lg object-cover"
              />
            )}
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">The programme</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Overview headline</label>
            <input
              className="field"
              value={form.overviewHeading}
              onChange={(e) => set('overviewHeading', e.target.value)}
              placeholder="A programme built around learning, challenge and"
            />
          </div>
          <div>
            <label className="field-label">Headline, italic part</label>
            <input
              className="field"
              value={form.overviewEmphasis}
              onChange={(e) => set('overviewEmphasis', e.target.value)}
              placeholder="teamwork"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="field-label">Introduction</label>
          <textarea
            className="field min-h-[140px]"
            value={form.intro}
            onChange={(e) => set('intro', e.target.value)}
          />
          <p className="mt-1 text-xs text-ink-soft">Leave a blank line between paragraphs.</p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Parents, children, teachers</h2>
        <p className="mt-1 text-sm text-ink-soft">
          The three columns that say who the trip looks after.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(['pctParents', 'pctChildren', 'pctTeachers'] as const).map((k) => (
            <div key={k}>
              <label className="field-label">{k.replace('pct', '')}</label>
              <textarea
                className="field min-h-[120px]"
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">What is and is not included</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label">Included</label>
            <textarea
              className="field min-h-[180px]"
              value={form.inclusions}
              onChange={(e) => set('inclusions', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Not included</label>
            <textarea
              className="field min-h-[180px]"
              value={form.exclusions}
              onChange={(e) => set('exclusions', e.target.value)}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-soft">One item per line.</p>
      </section>

      <button className="btn-primary !py-2.5" disabled={busy !== null} onClick={save}>
        {busy === 'doc' ? 'Saving…' : 'Save document'}
      </button>
    </div>
  );
}

/* ──────────────────────────────── itinerary ──────────────────────────────── */

function ItineraryTab({
  proposal,
  days,
  images,
  run,
  busy,
}: {
  proposal: Proposal;
  days: Day[];
  images: { id: number; alt: string; url: string }[];
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const [open, setOpen] = useState<number | null>(days[0]?.id ?? null);

  return (
    <div className="space-y-4">
      {days.length === 0 && (
        <p className="card p-10 text-center text-sm text-ink-soft">
          No days yet. Add the first one below.
        </p>
      )}

      {days.map((day, i) => (
        <div key={day.id} className="card">
          <div className="flex items-center justify-between gap-3 p-5">
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => setOpen(open === day.id ? null : day.id)}
            >
              <p className="eyebrow">Day {day.dayNumber}</p>
              <p className="truncate font-serif text-lg text-ink">{day.title || 'Untitled day'}</p>
            </button>
            <div className="flex shrink-0 gap-1.5">
              <button
                className="btn-outline !bg-white !px-3 !py-1.5 !text-xs"
                disabled={busy !== null || i === 0}
                onClick={() => run(`up${day.id}`, () => moveStProposalDay(proposal.id, day.id, -1))}
              >
                ↑
              </button>
              <button
                className="btn-outline !bg-white !px-3 !py-1.5 !text-xs"
                disabled={busy !== null || i === days.length - 1}
                onClick={() => run(`down${day.id}`, () => moveStProposalDay(proposal.id, day.id, 1))}
              >
                ↓
              </button>
            </div>
          </div>

          {open === day.id && (
            <DayForm proposal={proposal} day={day} images={images} run={run} busy={busy} />
          )}
        </div>
      ))}

      <button
        className="btn-outline !bg-white !py-2.5"
        disabled={busy !== null}
        onClick={() => run('addday', () => addStProposalDay(proposal.id), 'Day added.')}
      >
        {busy === 'addday' ? 'Adding…' : 'Add a day'}
      </button>
    </div>
  );
}

function DayForm({
  proposal,
  day,
  images,
  run,
  busy,
}: {
  proposal: Proposal;
  day: Day;
  images: { id: number; alt: string; url: string }[];
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const [form, setForm] = useState({
    date: day.date ?? '',
    title: day.title,
    summary: day.summary,
    overnight: day.overnight,
    imageIds: day.imageIds,
  });
  const [items, setItems] = useState(
    day.items.map((i) => ({ timeLabel: i.timeLabel, text: i.text })),
  );

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const res = await run(
      `day${day.id}`,
      () =>
        saveStProposalDay(proposal.id, {
          id: day.id,
          dayNumber: day.dayNumber,
          date: form.date || null,
          title: form.title,
          summary: form.summary,
          overnight: form.overnight,
          imageIds: form.imageIds,
          sortOrder: day.sortOrder,
        }),
    );
    if (res?.ok) {
      await run(`items${day.id}`, () => saveStProposalDayItems(proposal.id, day.id, items), 'Day saved.');
    }
  };

  return (
    <div className="border-t border-line p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Date</label>
          <input
            type="date"
            className="field"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Title</label>
          <input className="field" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <label className="field-label">Summary</label>
        <textarea
          className="field min-h-[100px]"
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="field-label">Overnight</label>
        <input
          className="field"
          value={form.overnight}
          onChange={(e) => set('overnight', e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="field-label">Photographs</label>
        <div className="mt-1 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-6">
          {images.map((img) => {
            const chosen = form.imageIds.includes(img.id);
            return (
              <button
                key={img.id}
                type="button"
                onClick={() =>
                  set(
                    'imageIds',
                    chosen
                      ? form.imageIds.filter((x) => x !== img.id)
                      : [...form.imageIds, img.id],
                  )
                }
                className={`relative overflow-hidden rounded-md border-2 transition ${
                  chosen ? 'border-teal' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                title={img.alt}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.alt} className="h-16 w-full object-cover" />
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {form.imageIds.length} selected. The layout is built for three.
        </p>
      </div>

      <div className="mt-5">
        <label className="field-label">Timetable</label>
        <div className="space-y-2">
          {items.map((item, n) => (
            <div key={n} className="flex gap-2">
              <input
                className="field w-40 shrink-0"
                value={item.timeLabel}
                placeholder="09:00"
                onChange={(e) =>
                  setItems((rows) =>
                    rows.map((r, j) => (j === n ? { ...r, timeLabel: e.target.value } : r)),
                  )
                }
              />
              <input
                className="field"
                value={item.text}
                placeholder="What happens"
                onChange={(e) =>
                  setItems((rows) => rows.map((r, j) => (j === n ? { ...r, text: e.target.value } : r)))
                }
              />
              <button
                type="button"
                className="shrink-0 px-2 text-sm font-semibold text-ink-soft hover:text-red-600"
                onClick={() => setItems((rows) => rows.filter((_, j) => j !== n))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-teal-deep hover:underline"
          onClick={() => setItems((rows) => [...rows, { timeLabel: '', text: '' }])}
        >
          + Add a line
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn-primary !py-2.5" disabled={busy !== null} onClick={save}>
          {busy === `day${day.id}` || busy === `items${day.id}` ? 'Saving…' : 'Save day'}
        </button>
        <button
          className="btn-outline !bg-white !py-2.5 !text-red-600"
          disabled={busy !== null}
          onClick={() => {
            if (!confirm(`Delete day ${day.dayNumber}? Its timetable goes too.`)) return;
            run(`del${day.id}`, () => deleteStProposalDay(proposal.id, day.id), 'Day deleted.');
          }}
        >
          Delete day
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────────── flights ───────────────────────────────── */

function FlightsTab({
  proposal,
  flights,
  run,
  busy,
}: {
  proposal: Proposal;
  flights: Flight[];
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const [rows, setRows] = useState(
    flights.map((f) => ({
      direction: f.direction,
      flightNumber: f.flightNumber,
      carrier: f.carrier,
      fromCode: f.fromCode,
      fromName: f.fromName,
      toCode: f.toCode,
      toName: f.toName,
      note: f.note,
    })),
  );

  const set = (n: number, k: string, v: string) =>
    setRows((r) => r.map((row, j) => (j === n ? { ...row, [k]: v } : row)));

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-ink">
        Times are shown on the proposal as written labels, not as a timezone-aware clock. Enter them
        the way they should read to the school.
      </p>

      {rows.map((row, n) => (
        <div key={n} className="card p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="field-label">Direction</label>
              <select
                className="field"
                value={row.direction}
                onChange={(e) => set(n, 'direction', e.target.value)}
              >
                <option value="outbound">Outbound</option>
                <option value="return">Return</option>
              </select>
            </div>
            <div>
              <label className="field-label">Flight</label>
              <input className="field" value={row.flightNumber} onChange={(e) => set(n, 'flightNumber', e.target.value)} />
            </div>
            <div>
              <label className="field-label">Carrier</label>
              <input className="field" value={row.carrier} onChange={(e) => set(n, 'carrier', e.target.value)} />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="pb-2.5 text-sm font-semibold text-ink-soft hover:text-red-600"
                onClick={() => setRows((r) => r.filter((_, j) => j !== n))}
              >
                Remove
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div>
              <label className="field-label">From code</label>
              <input className="field" value={row.fromCode} onChange={(e) => set(n, 'fromCode', e.target.value)} />
            </div>
            <div>
              <label className="field-label">From</label>
              <input className="field" value={row.fromName} onChange={(e) => set(n, 'fromName', e.target.value)} />
            </div>
            <div>
              <label className="field-label">To code</label>
              <input className="field" value={row.toCode} onChange={(e) => set(n, 'toCode', e.target.value)} />
            </div>
            <div>
              <label className="field-label">To</label>
              <input className="field" value={row.toName} onChange={(e) => set(n, 'toName', e.target.value)} />
            </div>
          </div>

          <div className="mt-3">
            <label className="field-label">Times, as they should read</label>
            <input
              className="field"
              value={row.note}
              placeholder="Departs 08:45 · Arrives 13:20"
              onChange={(e) => set(n, 'note', e.target.value)}
            />
          </div>
        </div>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-outline !bg-white !py-2.5"
          onClick={() =>
            setRows((r) => [
              ...r,
              {
                direction: 'outbound' as const,
                flightNumber: '',
                carrier: '',
                fromCode: '',
                fromName: '',
                toCode: '',
                toName: '',
                note: '',
              },
            ])
          }
        >
          Add a flight
        </button>
        <button
          className="btn-primary !py-2.5"
          disabled={busy !== null}
          onClick={() =>
            run('flights', () => saveStProposalFlights(proposal.id, rows), 'Flights saved.')
          }
        >
          {busy === 'flights' ? 'Saving…' : 'Save flights'}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────── price ────────────────────────────────── */

function PriceTab({
  proposal,
  termsSets,
  run,
  busy,
}: {
  proposal: Proposal;
  termsSets: { id: number; name: string; version: number; isDefault: boolean }[];
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const m = proposal.commercials;
  const [form, setForm] = useState({
    preparedFor: m.preparedFor,
    travelStart: m.travelStart ?? '',
    travelEnd: m.travelEnd ?? '',
    studentCount: m.studentCount?.toString() ?? '',
    freePlacesTeachers: m.freePlacesTeachers?.toString() ?? '',
    freePlacesPctStaff: m.freePlacesPctStaff?.toString() ?? '',
    pricePerStudent: m.pricePerStudent?.toString() ?? '',
    currency: m.currency,
    priceBasisNote: m.priceBasisNote,
    heroEffect: proposal.heroEffect,
    termsSetId: proposal.termsSetId,
  });

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const num = (s: string) => (s.trim() === '' ? null : Number(s));

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">The school and the dates</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="field-label">Prepared for</label>
            <input
              className="field"
              value={form.preparedFor}
              onChange={(e) => set('preparedFor', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Departure</label>
            <input
              type="date"
              className="field"
              value={form.travelStart}
              onChange={(e) => set('travelStart', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Return</label>
            <input
              type="date"
              className="field"
              value={form.travelEnd}
              onChange={(e) => set('travelEnd', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Students</label>
            <input
              type="number"
              className="field"
              value={form.studentCount}
              onChange={(e) => set('studentCount', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Price</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Currency</label>
            <input
              className="field"
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Price per student</label>
            <input
              type="number"
              className="field"
              value={form.pricePerStudent}
              onChange={(e) => set('pricePerStudent', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Free places — teachers</label>
            <input
              type="number"
              className="field"
              value={form.freePlacesTeachers}
              onChange={(e) => set('freePlacesTeachers', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Free places — PCT staff</label>
            <input
              type="number"
              className="field"
              value={form.freePlacesPctStaff}
              onChange={(e) => set('freePlacesPctStaff', e.target.value)}
            />
          </div>
          <div className="flex items-end pb-2.5 text-sm text-ink-soft">
            Total free places:{' '}
            <b className="ml-1 text-ink">
              {(num(form.freePlacesTeachers) ?? 0) + (num(form.freePlacesPctStaff) ?? 0)}
            </b>
          </div>
          <div className="sm:col-span-3">
            <label className="field-label">What the price is based on</label>
            <input
              className="field"
              value={form.priceBasisNote}
              onChange={(e) => set('priceBasisNote', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Presentation</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Booking conditions</label>
            <select
              className="field"
              value={form.termsSetId ?? ''}
              onChange={(e) => set('termsSetId', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {termsSets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version}){t.isDefault ? ' · default' : ''}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.heroEffect}
              onChange={(e) => set('heroEffect', e.target.checked)}
            />
            Snowfall on the hero
          </label>
        </div>
      </section>

      <button
        className="btn-primary !py-2.5"
        disabled={busy !== null}
        onClick={() =>
          run(
            'price',
            () =>
              updateStProposalCommercials(proposal.id, {
                preparedFor: form.preparedFor,
                travelStart: form.travelStart || null,
                travelEnd: form.travelEnd || null,
                studentCount: num(form.studentCount),
                freePlacesTeachers: num(form.freePlacesTeachers),
                freePlacesPctStaff: num(form.freePlacesPctStaff),
                pricePerStudent: num(form.pricePerStudent),
                currency: form.currency,
                priceBasisNote: form.priceBasisNote,
                heroEffect: form.heroEffect,
                termsSetId: form.termsSetId,
              }),
            'Price saved.',
          )
        }
      >
        {busy === 'price' ? 'Saving…' : 'Save price'}
      </button>
    </div>
  );
}

/* ────────────────────────────────── share ────────────────────────────────── */

function ShareTab({
  proposal,
  events,
  siteUrl,
  run,
  busy,
}: {
  proposal: Proposal;
  events: ProposalEvent[];
  siteUrl: string;
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const [days, setDays] = useState('30');
  const [url, setUrl] = useState<string | null>(
    proposal.shareToken ? `${siteUrl}/p/${proposal.shareToken}` : null,
  );

  const expired =
    proposal.shareExpiresAt && new Date(proposal.shareExpiresAt).getTime() < Date.now();

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">The school&rsquo;s link</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Anyone holding this link can read the proposal, so it is unguessable and can be given an
          expiry. Issuing a new link replaces the old one immediately.
        </p>

        {url ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <input className="field flex-1" readOnly value={url} onFocus={(e) => e.target.select()} />
              <button
                className="btn-outline !bg-white !py-2.5"
                onClick={() => navigator.clipboard?.writeText(url)}
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-soft">
              {proposal.shareExpiresAt
                ? expired
                  ? 'This link has expired — the school now sees a 404.'
                  : `Expires ${new Date(proposal.shareExpiresAt).toLocaleDateString('en-GB')}.`
                : 'No expiry.'}
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-soft">No link has been issued yet.</p>
        )}

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">Expires in (days)</label>
            <input
              type="number"
              className="field w-40"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Blank for never"
            />
          </div>
          <button
            className="btn-primary !py-2.5"
            disabled={busy !== null}
            onClick={async () => {
              const res = await run(
                'link',
                () => issueStProposalLink(proposal.id, days.trim() ? Number(days) : null),
                'Link issued.',
              );
              if (res?.url) setUrl(res.url);
            }}
          >
            {busy === 'link' ? 'Issuing…' : url ? 'Issue a new link' : 'Issue link'}
          </button>
          {url && (
            <button
              className="btn-outline !bg-white !py-2.5 !text-red-600"
              disabled={busy !== null}
              onClick={async () => {
                if (!confirm('Revoke the link? The school will no longer be able to open it.')) return;
                const res = await run('revoke', () => revokeStProposalLink(proposal.id), 'Link revoked.');
                if (res?.ok) setUrl(null);
              }}
            >
              Revoke
            </button>
          )}
        </div>
      </section>

      <SendCard proposal={proposal} run={run} busy={busy} />

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Where it stands</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['draft', 'sent', 'viewed', 'accepted', 'expired'] as const).map((s) => (
            <button
              key={s}
              disabled={busy !== null}
              onClick={() => run(`status${s}`, () => setStProposalStatus(proposal.id, s), 'Status updated.')}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                proposal.status === s
                  ? 'bg-teal text-white'
                  : 'border border-line bg-white text-ink-soft hover:text-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          {proposal.pdfGeneratedAt
            ? `PDF last built ${new Date(proposal.pdfGeneratedAt).toLocaleString('en-GB')}. It rebuilds by itself after an edit.`
            : 'No PDF built yet — one is made the first time it is asked for.'}
        </p>
      </section>

      <Timeline events={events} />
    </div>
  );
}

/* ─────────────────────────────── sending it ─────────────────────────────── */

function SendCard({
  proposal,
  run,
  busy,
}: {
  proposal: Proposal;
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState('60');
  const [skipped, setSkipped] = useState(false);

  return (
    <section className="card p-6">
      <h2 className="font-serif text-xl text-ink">Send it to the school</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Issues a fresh link and emails it. Any link already in circulation stops working.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">To</label>
          <input
            type="email"
            className="field"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="trips@school.ae"
          />
        </div>
        <div>
          <label className="field-label">Link expires in (days)</label>
          <input
            type="number"
            className="field"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Blank for never"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="field-label">Message</label>
        <textarea
          className="field min-h-[100px]"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Leave blank to use the standard wording."
        />
      </div>

      {skipped && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-ink">
          The link was issued and the proposal is marked sent, but no email went out — this
          deployment has no mail key configured. Copy the link above and send it yourself.
        </p>
      )}

      <button
        className="btn-primary mt-5 !py-2.5"
        disabled={busy !== null || !to.includes('@')}
        onClick={async () => {
          setSkipped(false);
          const res = await run(
            'send',
            () =>
              sendStProposalEmail(proposal.id, {
                to,
                message,
                expiresInDays: days.trim() ? Number(days) : null,
              }),
            'Sent.',
          );
          if (res?.skipped) setSkipped(true);
        }}
      >
        {busy === 'send' ? 'Sending…' : 'Send the proposal'}
      </button>
    </section>
  );
}

/* ──────────────────────────────── timeline ──────────────────────────────── */

const EVENT_LABELS: Record<string, string> = {
  created: 'Created',
  sent: 'Sent to the school',
  viewed: 'Opened by the school',
  pdf_downloaded: 'PDF downloaded',
  accepted: 'Accepted',
};

function Timeline({ events }: { events: ProposalEvent[] }) {
  if (events.length === 0) {
    return (
      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Activity</h2>
        <p className="mt-2 text-sm text-ink-soft">Nothing has happened yet.</p>
      </section>
    );
  }

  const views = events.filter((e) => e.event === 'viewed');
  // Every open is recorded, which makes an honest count but a long list. The
  // opens are summarised and the rest shown in full.
  const rest = events.filter((e) => e.event !== 'viewed').slice(0, 30);

  return (
    <section className="card p-6">
      <h2 className="font-serif text-xl text-ink">Activity</h2>

      {views.length > 0 && (
        <p className="mt-3 rounded-xl bg-teal/10 px-4 py-3 text-sm text-teal-deep">
          Opened <b>{views.length}</b> {views.length === 1 ? 'time' : 'times'} — first on{' '}
          {when(views[views.length - 1].createdAt)}, most recently {when(views[0].createdAt)}.
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {rest.map((e) => (
          <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-ink">
              {EVENT_LABELS[e.event] ?? e.event}
              {typeof e.metadata.to === 'string' && (
                <span className="text-ink-soft"> · {e.metadata.to}</span>
              )}
              {e.metadata.skipped === true && (
                <span className="text-amber-700"> · not emailed, no mail key</span>
              )}
              {e.metadata.throttled === true && <span className="text-ink-soft"> · from cache</span>}
            </span>
            <span className="text-xs text-ink-soft">{when(e.createdAt)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function when(iso: string) {
  if (!iso) return 'an unknown time';
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
