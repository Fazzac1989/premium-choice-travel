import Link from 'next/link';
import ImportForm from '@/components/admin/ImportForm';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export default function StImportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips overview
      </Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">AI trip importer</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Upload a trip document, paste a link, or paste the text — Claude drafts the trip
        directly on the <strong>Premium Choice School Trips</strong> platform and opens it in
        the editor. Nothing is published until you say so.
      </p>
      <div className="mt-8">
        <ImportForm kind="st-trip" />
      </div>
    </div>
  );
}
