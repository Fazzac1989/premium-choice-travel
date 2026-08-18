'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deleteStQuote, saveStQuote, type StActionState } from '@/lib/admin/st-actions';
import ListEditor from '@/components/admin/ListEditor';
import ItineraryEditor from '@/components/admin/ItineraryEditor';
import StatusBadge from '@/components/admin/StatusBadge';
import CopyButton from '@/components/admin/CopyButton';
import { GalleryField, ImageField } from '@/components/admin/ImageField';
import { formatMoney } from '@/lib/quote-math';
import type { StQuote, StQuoteLine } from '@/lib/pcst';
import type { ItineraryDay } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? 'Saving…' : 'Save quote'}
    </button>
  );
}

const emptyLine = (markupPct: number): StQuoteLine => ({ description: '', qty: 1, unitCost: 0, markupPct });
const sell = (l: StQuoteLine) => l.qty * l.unitCost * (1 + l.markupPct / 100);

export default function StQuoteEditor({ quote, clientUrl }: { quote: StQuote; clientUrl: string }) {
  const [saveState, saveAction] = useFormState<StActionState, FormData>(saveStQuote, null);

  const [title, setTitle] = useState(quote.title);
  const [status, setStatus] = useState(quote.status);
  const [schoolName, setSchoolName] = useState(quote.schoolName);
  const [schoolLogo, setSchoolLogo] = useState(quote.schoolLogo);
  const [teacherName, setTeacherName] = useState(quote.teacherName);
  const [teacherEmail, setTeacherEmail] = useState(quote.teacherEmail);
  const [travelDates, setTravelDates] = useState(quote.travelDates);
  const [validity, setValidity] = useState(quote.validity ?? '');
  const [pupils, setPupils] = useState<string>(quote.pupils?.toString() ?? '');
  const [staff, setStaff] = useState<string>(quote.staff?.toString() ?? '');
  const [notes, setNotes] = useState(quote.notes);
  const [currency, setCurrency] = useState(quote.currency);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(quote.itinerary);
  const [images, setImages] = useState<string[]>(quote.images);
  const [terms, setTerms] = useState<string[]>(quote.terms);
  const [lines, setLines] = useState<StQuoteLine[]>(
    quote.lines.length > 0 ? quote.lines : [emptyLine(quote.defaultMarkupPct)]
  );

  const payload = useMemo(
    () =>
      JSON.stringify({
        title, status, schoolName, schoolLogo, teacherName, teacherEmail,
        travelDates, validity, pupils, staff, notes, currency, itinerary, images, terms, lines,
      }),
    [title, status, schoolName, schoolLogo, teacherName, teacherEmail, travelDates,
     validity, pupils, staff, notes, currency, itinerary, images, terms, lines]
  );

  const updateLine = (i: number, patch: Partial<StQuoteLine>) =>
    setLines((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], ...patch };
      return next;
    });
  const moveLine = (i: number, dir: -1 | 1) =>
    setLines((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const active = lines.filter((l) => l.description.trim());
  const total = active.reduce((s, l) => s + sell(l), 0);
  const cost = active.reduce((s, l) => s + l.qty * l.unitCost, 0);
  const pupilCount = Number(pupils) || 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/school-trips/quotes" className="text-sm font-semibold text-teal-deep hover:underline">← School Trips quotes</Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-serif text-3xl text-ink">{quote.ref}</h1>
            <StatusBadge status={status} />
          </div>
        </div>
        <a href={clientUrl} target="_blank" rel="noopener" className="btn-outline !bg-white !px-5 !py-2.5">
          Preview teacher page ↗
        </a>
      </div>

      {/* Share bar */}
      <div className="card mt-6 flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Teacher link</span>
        <code className="min-w-0 flex-1 truncate rounded-lg bg-sand px-3 py-2 text-xs text-ink">{clientUrl}</code>
        <CopyButton text={clientUrl} />
      </div>

      <form action={saveAction} className="mt-6 space-y-6">
        <input type="hidden" name="id" value={quote.id} />
        <input type="hidden" name="payload" value={payload} />

        {/* School & trip */}
        <section className="card p-6">
          <h2 className="font-serif text-xl text-ink">School & trip</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="field-label">Quote title *</label>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="field-label">School name</label>
              <input className="field" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Teacher name</label>
              <input className="field" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Teacher email</label>
              <input type="email" className="field" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Travel dates</label>
              <input className="field" value={travelDates} onChange={(e) => setTravelDates(e.target.value)} placeholder="e.g. 14–18 October 2026" />
            </div>
            <div>
              <label className="field-label">Quote valid until</label>
              <input type="date" className="field" value={validity ?? ''} onChange={(e) => setValidity(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="field-label">Pupils</label>
                <input type="number" min={0} className="field" value={pupils} onChange={(e) => setPupils(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="field-label">Staff</label>
                <input type="number" min={0} className="field" value={staff} onChange={(e) => setStaff(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Currency</label>
              <input className="field" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['draft', 'published', 'accepted', 'declined', 'expired'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="field-label">Note to the teacher</label>
              <textarea rows={2} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <ImageField label="School logo (shown on the quote)" value={schoolLogo} onChange={setSchoolLogo} />
            </div>
          </div>
        </section>

        {/* Costings */}
        <section className="card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-ink">Costings</h2>
            <p className="text-xs text-ink-soft">Cost + markup = the price the school sees. Teachers never see cost or markup.</p>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="pb-2 pr-3 font-semibold">Description</th>
                  <th className="w-16 pb-2 pr-3 font-semibold">Qty</th>
                  <th className="w-28 pb-2 pr-3 font-semibold">Unit cost</th>
                  <th className="w-20 pb-2 pr-3 font-semibold">Markup %</th>
                  <th className="w-28 pb-2 pr-3 text-right font-semibold">Line total</th>
                  <th className="w-20 pb-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-line align-top">
                    <td className="py-2 pr-3">
                      <input className="field !py-2" value={l.description} placeholder="e.g. Return flights Dubai–Keflavik"
                        onChange={(e) => updateLine(i, { description: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min={0} step="any" className="field !px-2 !py-2" value={l.qty}
                        onChange={(e) => updateLine(i, { qty: Number(e.target.value) })} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min={0} step="any" className="field !px-2 !py-2" value={l.unitCost}
                        onChange={(e) => updateLine(i, { unitCost: Number(e.target.value) })} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" step="any" className="field !px-2 !py-2" value={l.markupPct}
                        onChange={(e) => updateLine(i, { markupPct: Number(e.target.value) })} />
                    </td>
                    <td className="py-2 pr-3 pt-4 text-right font-semibold text-ink">{formatMoney(currency, sell(l))}</td>
                    <td className="py-2 pt-3.5 text-right">
                      <button type="button" onClick={() => moveLine(i, -1)} className="rounded p-1 text-ink-soft hover:bg-sand" aria-label="Move up">↑</button>
                      <button type="button" onClick={() => moveLine(i, 1)} className="rounded p-1 text-ink-soft hover:bg-sand" aria-label="Move down">↓</button>
                      <button type="button" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} className="rounded p-1 text-danger hover:bg-sand" aria-label="Remove">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setLines((prev) => [...prev, emptyLine(quote.defaultMarkupPct)])} className="mt-3 text-sm font-semibold text-teal-deep hover:underline">
            + Add line
          </button>

          <div className="mt-6 flex flex-wrap justify-end gap-4">
            <div className="rounded-xl bg-sand px-5 py-3 text-right">
              <p className="text-[11px] uppercase tracking-wider text-ink-soft">Your cost</p>
              <p className="font-semibold text-ink">{formatMoney(currency, cost)}</p>
            </div>
            <div className="rounded-xl bg-sand px-5 py-3 text-right">
              <p className="text-[11px] uppercase tracking-wider text-ink-soft">Margin</p>
              <p className="font-semibold text-teal-deep">{formatMoney(currency, total - cost)}</p>
            </div>
            <div className="rounded-xl bg-ink px-5 py-3 text-right text-white">
              <p className="text-[11px] uppercase tracking-wider text-white/60">School total</p>
              <p className="font-serif text-xl">{formatMoney(currency, total)}</p>
              {pupilCount > 0 && (
                <p className="text-[11px] text-teal">{formatMoney(currency, total / pupilCount)} per student</p>
              )}
            </div>
          </div>
        </section>

        {/* Presentation */}
        <section className="card p-6">
          <h2 className="font-serif text-xl text-ink">Presentation</h2>
          <p className="mt-1 text-sm text-ink-soft">What the teacher sees on their quote page and PDF.</p>
          <div className="mt-5 space-y-6">
            <GalleryField label="Gallery images" images={images} onChange={setImages} />
            <ItineraryEditor items={itinerary} onChange={setItinerary} />
            <ListEditor label="Terms & conditions" items={terms} onChange={setTerms} multiline />
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            formAction={deleteStQuote}
            formNoValidate
            className="text-sm font-semibold text-danger hover:underline"
            onClick={(e) => {
              if (!confirm('Delete this school quote permanently? The teacher link will stop working.')) e.preventDefault();
            }}
          >
            Delete quote
          </button>
          <div className="flex items-center gap-3">
            {saveState && (
              <p className={`text-sm ${saveState.ok ? 'text-teal-deep' : 'text-danger'}`}>{saveState.message}</p>
            )}
            <SaveButton />
          </div>
        </div>
      </form>
    </div>
  );
}
