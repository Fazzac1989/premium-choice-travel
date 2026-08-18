import Link from 'next/link';
import { listQuotes } from '@/lib/quotes';
import QuotesTable from '@/components/admin/QuotesTable';

export const dynamic = 'force-dynamic';

export default async function AdminQuotesPage() {
  const quotes = await listQuotes();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Quotes</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Build a quote, share the link or PDF, track its status.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/quotes/import" className="btn-outline !bg-white">AI import</Link>
          <Link href="/admin/quotes/new" className="btn-primary">New quote</Link>
        </div>
      </div>
      <div className="mt-8">
        <QuotesTable quotes={quotes} />
      </div>
    </>
  );
}
