import Link from 'next/link';
import ImportForm from '@/components/admin/ImportForm';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export default function QuoteImportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/quotes" className="text-sm font-semibold text-teal-deep hover:underline">← Quotes</Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">AI quote importer</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Upload a supplier costing sheet, paste a link, or paste the text — Claude extracts the
        client details, itinerary and costed lines into a draft quote. Costs come in as supplier
        cost with 0% markup, ready for you to price and send.
      </p>
      <div className="mt-8">
        <ImportForm kind="quote" />
      </div>
    </div>
  );
}
