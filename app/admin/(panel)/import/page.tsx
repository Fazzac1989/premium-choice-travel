import Link from 'next/link';
import ImportForm from '@/components/admin/ImportForm';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/packages" className="text-sm font-semibold text-teal-deep hover:underline">← Packages</Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">AI package importer</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Upload a supplier document, paste a link to online content, or paste the text — Claude
        turns it into a ready-to-review draft: title, overview, itinerary, inclusions, pricing and
        the right brand section. You review and publish; only facts from the source are used.
      </p>
      <div className="mt-8">
        <ImportForm />
      </div>
    </div>
  );
}
