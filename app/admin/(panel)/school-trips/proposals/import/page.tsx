import Link from 'next/link';
import StProposalImport from '@/components/admin/StProposalImport';

export const dynamic = 'force-dynamic';
// Reading a long document and extracting it takes longer than the default.
export const maxDuration = 120;

export default function StProposalImportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/school-trips/proposals"
        className="text-sm font-semibold text-teal-deep hover:underline"
      >
        ← Proposals
      </Link>

      <h1 className="mt-2 font-serif text-3xl text-ink">Import a proposal</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Upload a proposal that already exists — a Word file, a web page, or pasted text — and it
        is turned into a draft you can edit. Prices, dates, flight numbers and venues are taken
        only from the document: anything it does not say is left empty and listed for you, rather
        than filled in with something plausible.
      </p>

      <div className="mt-8">
        <StProposalImport />
      </div>
    </div>
  );
}
