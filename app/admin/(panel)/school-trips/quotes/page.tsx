import Link from 'next/link';
import { listStQuotes } from '@/lib/pcst';
import { formatMoney } from '@/lib/quote-math';
import StatusBadge from '@/components/admin/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function StQuotesPage() {
  const quotes = await listStQuotes();

  return (
    <>
      <div>
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Quotes</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Every school quotation, live from the School Trips platform.
        </p>
      </div>

      <div className="card mt-8 divide-y divide-line">
        {quotes.length === 0 && <p className="p-10 text-center text-sm text-ink-soft">No quotes yet.</p>}
        {quotes.map((q) => (
          <Link key={q.id} href={`/admin/school-trips/quotes/${q.id}`} className="flex items-center gap-5 p-4 transition-colors hover:bg-sand">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{q.title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {q.ref} · {q.schoolName || 'No school'} {q.teacherName ? `· ${q.teacherName}` : ''}
                {q.travelDates ? ` · ${q.travelDates}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-ink">{formatMoney(q.currency, q.total)}</p>
              {q.perStudent !== null && (
                <p className="text-[11px] text-ink-soft">{formatMoney(q.currency, q.perStudent)} / student</p>
              )}
              <div className="mt-1"><StatusBadge status={q.status} /></div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
