import Link from 'next/link';
import { formatMoney, quoteTotal, type Quote } from '@/lib/quote-math';
import StatusBadge from '@/components/admin/StatusBadge';

export default function QuotesTable({ quotes }: { quotes: Quote[] }) {
  return (
    <div className="card divide-y divide-line">
      {quotes.length === 0 && (
        <p className="p-10 text-center text-sm text-ink-soft">
          No quotes here yet — create one and send it in minutes.
        </p>
      )}
      {quotes.map((q) => (
        <Link key={q.id} href={`/admin/quotes/${q.id}`} className="flex items-center gap-5 p-4 transition-colors hover:bg-sand">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{q.title}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {q.ref} · {q.clientName ?? 'No client yet'}
              {q.travelDates ? ` · ${q.travelDates}` : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-ink">{formatMoney(q.currency, quoteTotal(q.lines))}</p>
            <div className="mt-1"><StatusBadge status={q.status} /></div>
          </div>
        </Link>
      ))}
    </div>
  );
}
