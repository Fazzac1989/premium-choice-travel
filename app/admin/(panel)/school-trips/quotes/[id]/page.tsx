import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStQuote, stQuoteClientUrl } from '@/lib/pcst';
import { setStQuoteStatus } from '@/lib/admin/st-actions';
import { formatMoney } from '@/lib/quote-math';
import StatusBadge from '@/components/admin/StatusBadge';
import CopyButton from '@/components/admin/CopyButton';

export const dynamic = 'force-dynamic';

export default async function StQuotePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const quote = await getStQuote(id);
  if (!quote) notFound();

  const clientUrl = stQuoteClientUrl(quote);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/school-trips/quotes" className="text-sm font-semibold text-teal-deep hover:underline">← School Trips quotes</Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl text-ink">{quote.ref}</h1>
        <StatusBadge status={quote.status} />
      </div>
      <p className="mt-1 text-ink-soft">{quote.title}</p>

      {/* Share */}
      <div className="card mt-6 flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Teacher link</span>
        <code className="min-w-0 flex-1 truncate rounded-lg bg-sand px-3 py-2 text-xs text-ink">{clientUrl}</code>
        <CopyButton text={clientUrl} />
        <a href={clientUrl} target="_blank" rel="noopener" className="btn-outline !px-4 !py-2 text-xs">Preview ↗</a>
      </div>

      {/* Facts */}
      <div className="card mt-6 grid gap-x-10 gap-y-4 p-6 sm:grid-cols-3">
        {[
          ['School', quote.schoolName || '—'],
          ['Teacher', quote.teacherName ? `${quote.teacherName}${quote.teacherEmail ? ` (${quote.teacherEmail})` : ''}` : '—'],
          ['Travel dates', quote.travelDates || '—'],
          ['Group', quote.pupils ? `${quote.pupils} pupils${quote.staff ? ` + ${quote.staff} staff` : ''}` : '—'],
          ['Valid until', quote.validity ? new Date(quote.validity).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      {/* Lines */}
      <div className="card mt-6 p-6">
        <h2 className="font-serif text-xl text-ink">Costings</h2>
        <div className="mt-4 divide-y divide-line">
          {quote.lines.map((l, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-2.5 text-sm">
              <span className="text-ink-soft">
                {l.description}
                {l.qty !== 1 ? ` (× ${l.qty})` : ''}
                <span className="ml-2 text-xs text-ink-soft/60">cost {formatMoney(quote.currency, l.unitCost)} +{l.markupPct}%</span>
              </span>
              <span className="shrink-0 font-semibold text-ink">
                {formatMoney(quote.currency, l.qty * l.unitCost * (1 + l.markupPct / 100))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t-2 border-ink pt-3">
          <p className="font-bold text-ink">Total</p>
          <div className="text-right">
            <p className="font-serif text-2xl text-ink">{formatMoney(quote.currency, quote.total)}</p>
            {quote.perStudent !== null && (
              <p className="text-xs text-ink-soft">{formatMoney(quote.currency, quote.perStudent)} per student</p>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="card mt-6 flex flex-wrap items-center gap-2 p-5">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Set status</span>
        <form action={setStQuoteStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={quote.id} />
          {['draft', 'published', 'accepted', 'declined', 'expired']
            .filter((s) => s !== quote.status)
            .map((s) => (
              <button key={s} type="submit" name="status" value={s} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-teal hover:text-teal-deep">
                → {s}
              </button>
            ))}
        </form>
      </div>

      <p className="mt-4 text-xs text-ink-soft">
        Line-by-line editing for school quotes is coming to the console next — for now, costings shown here are read-only.
      </p>
    </div>
  );
}
