'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  deleteQuote,
  saveQuote,
  sendQuoteToClient,
  type QuoteActionState,
} from '@/lib/admin/quote-actions';
import ListEditor from '@/components/admin/ListEditor';
import ItineraryEditor from '@/components/admin/ItineraryEditor';
import StatusBadge from '@/components/admin/StatusBadge';
import {
  formatMoney,
  lineTotal,
  quoteCost,
  quoteTotal,
  sellUnit,
  type Quote,
  type QuoteLine,
} from '@/lib/quote-math';
import type { ItineraryDay } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? 'Saving…' : 'Save quote'}
    </button>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-dark !px-5 !py-2.5 disabled:opacity-60">
      {pending ? 'Sending…' : 'Email quote to client'}
    </button>
  );
}

const emptyLine = (markupPct: number): QuoteLine => ({
  description: '',
  qty: 1,
  unitCost: 0,
  markupPct,
});

export default function QuoteEditor({ quote, siteUrl }: { quote: Quote; siteUrl: string }) {
  const [saveState, saveAction] = useFormState<QuoteActionState, FormData>(saveQuote, null);
  const [sendState, sendAction] = useFormState<QuoteActionState, FormData>(sendQuoteToClient, null);

  const [title, setTitle] = useState(quote.title);
  const [status, setStatus] = useState<string>(quote.status);
  const [clientName, setClientName] = useState(quote.clientName ?? '');
  const [clientEmail, setClientEmail] = useState(quote.clientEmail ?? '');
  const [clientPhone, setClientPhone] = useState(quote.clientPhone ?? '');
  const [travelDates, setTravelDates] = useState(quote.travelDates ?? '');
  const [validity, setValidity] = useState(quote.validity ?? '');
  const [adults, setAdults] = useState<string>(quote.adults?.toString() ?? '');
  const [children, setChildren] = useState<string>(quote.children?.toString() ?? '');
  const [currency, setCurrency] = useState(quote.currency);
  const [notes, setNotes] = useState(quote.notes ?? '');
  const [heroImage, setHeroImage] = useState(quote.heroImage ?? '');
  const [images, setImages] = useState<string[]>(quote.images);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(quote.itinerary);
  const [inclusions, setInclusions] = useState<string[]>(quote.inclusions);
  const [exclusions, setExclusions] = useState<string[]>(quote.exclusions);
  const [terms, setTerms] = useState<string[]>(quote.terms);
  const [lines, setLines] = useState<QuoteLine[]>(
    quote.lines.length > 0 ? quote.lines : [emptyLine(quote.defaultMarkupPct)]
  );

  const payload = useMemo(
    () =>
      JSON.stringify({
        title, status, clientName, clientEmail, clientPhone, travelDates,
        validity, adults, children, currency, notes, heroImage, images,
        itinerary, inclusions, exclusions, terms, lines,
      }),
    [title, status, clientName, clientEmail, clientPhone, travelDates, validity,
     adults, children, currency, notes, heroImage, images, itinerary, inclusions,
     exclusions, terms, lines]
  );

  const updateLine = (i: number, patch: Partial<QuoteLine>) => {
    setLines((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };
  const moveLine = (i: number, dir: -1 | 1) => {
    setLines((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const activeLines = lines.filter((l) => l.description.trim());
  const total = quoteTotal(activeLines);
  const cost = quoteCost(activeLines);
  const travellers = (Number(adults) || 0) + (Number(children) || 0);
  const shareUrl = `${siteUrl}/quotes/${quote.publicToken}`;
  const pdfUrl = `/api/quotes/pdf?token=${quote.publicToken}`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/quotes" className="text-sm font-semibold text-teal-deep hover:underline">← Quotes</Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-serif text-3xl text-ink">{quote.ref}</h1>
            <StatusBadge status={status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href={pdfUrl} target="_blank" className="btn-outline !bg-white !px-5 !py-2.5">Download PDF</a>
          <a href={shareUrl} target="_blank" className="btn-outline !bg-white !px-5 !py-2.5">Preview client page ↗</a>
        </div>
      </div>

      {/* Share bar */}
      <div className="card mt-6 flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Share link</span>
        <code className="min-w-0 flex-1 truncate rounded-lg bg-sand px-3 py-2 text-xs text-ink">{shareUrl}</code>
        <button
          type="button"
          className="btn-outline !px-4 !py-2 text-xs"
          onClick={() => navigator.clipboard.writeText(shareUrl)}
        >
          Copy link
        </button>
        <form action={sendAction}>
          <input type="hidden" name="id" value={quote.id} />
          <SendButton />
        </form>
      </div>
      {sendState && (
        <p className={`mt-2 text-sm ${sendState.ok ? 'text-teal-deep' : 'text-danger'}`}>{sendState.message}</p>
      )}

      <form action={saveAction} className="mt-6 space-y-6">
        <input type="hidden" name="id" value={quote.id} />
        <input type="hidden" name="payload" value={payload} />

        {/* Client & trip */}
        <section className="card p-6">
          <h2 className="font-serif text-xl text-ink">Client & trip</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="field-label">Quote title *</label>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Maldives Escape — Hard Rock Hotel" />
            </div>
            <div>
              <label className="field-label">Client name</label>
              <input className="field" value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Client email</label>
              <input type="email" className="field" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Client phone</label>
              <input className="field" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Travel dates</label>
              <input className="field" value={travelDates} onChange={(e) => setTravelDates(e.target.value)} placeholder="e.g. 20–25 December 2026" />
            </div>
            <div>
              <label className="field-label">Quote valid until</label>
              <input type="date" className="field" value={validity ?? ''} onChange={(e) => setValidity(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="field-label">Adults</label>
                <input type="number" min={0} className="field" value={adults} onChange={(e) => setAdults(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="field-label">Children</label>
                <input type="number" min={0} className="field" value={children} onChange={(e) => setChildren(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="field-label">Currency</label>
              <input className="field" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
                {['draft', 'sent', 'accepted', 'declined', 'expired'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="field-label">Personal note to the client</label>
              <textarea rows={2} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shown at the top of the quote page — e.g. “It was lovely speaking with you today…”" />
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="card p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-ink">Pricing</h2>
            <p className="text-xs text-ink-soft">Cost + markup = the price the client sees. Clients never see cost or markup.</p>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left text-[11px] uppercase tracking-wider text-ink-soft">
                  <th className="pb-2 pr-3 font-semibold">Description</th>
                  <th className="w-16 pb-2 pr-3 font-semibold">Qty</th>
                  <th className="w-28 pb-2 pr-3 font-semibold">Unit cost</th>
                  <th className="w-20 pb-2 pr-3 font-semibold">Markup %</th>
                  <th className="w-28 pb-2 pr-3 text-right font-semibold">Unit sell</th>
                  <th className="w-28 pb-2 pr-3 text-right font-semibold">Line total</th>
                  <th className="w-20 pb-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-line align-top">
                    <td className="py-2 pr-3">
                      <input
                        className="field !py-2"
                        value={l.description}
                        placeholder="e.g. Beach Villa, 4 nights, half board"
                        onChange={(e) => updateLine(i, { description: e.target.value })}
                      />
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
                    <td className="py-2 pr-3 pt-4 text-right text-ink-soft">{formatMoney(currency, sellUnit(l))}</td>
                    <td className="py-2 pr-3 pt-4 text-right font-semibold text-ink">{formatMoney(currency, lineTotal(l))}</td>
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
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, emptyLine(quote.defaultMarkupPct)])}
            className="mt-3 text-sm font-semibold text-teal-deep hover:underline"
          >
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
              <p className="text-[11px] uppercase tracking-wider text-white/60">Client total</p>
              <p className="font-serif text-xl">{formatMoney(currency, total)}</p>
              {travellers > 0 && (
                <p className="text-[11px] text-teal">{formatMoney(currency, total / travellers)} per person</p>
              )}
            </div>
          </div>
        </section>

        {/* Presentation */}
        <section className="card p-6">
          <h2 className="font-serif text-xl text-ink">Presentation</h2>
          <p className="mt-1 text-sm text-ink-soft">What the client sees on their quote page and PDF.</p>
          <div className="mt-5 space-y-6">
            <div>
              <label className="field-label">Cover image URL</label>
              <input className="field" value={heroImage} onChange={(e) => setHeroImage(e.target.value)} placeholder="https://…" />
            </div>
            <ListEditor label="Gallery images" items={images} onChange={setImages} placeholder="https://…" />
            <ItineraryEditor items={itinerary} onChange={setItinerary} />
            <div className="grid gap-6 sm:grid-cols-2">
              <ListEditor label="Inclusions" items={inclusions} onChange={setInclusions} placeholder="e.g. Return speedboat transfers" />
              <ListEditor label="Exclusions" items={exclusions} onChange={setExclusions} placeholder="e.g. International flights" />
            </div>
            <ListEditor label="Terms & conditions" items={terms} onChange={setTerms} multiline />
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            formAction={deleteQuote}
            formNoValidate
            className="text-sm font-semibold text-danger hover:underline"
            onClick={(e) => {
              if (!confirm('Delete this quote permanently? The client link will stop working.')) e.preventDefault();
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
