import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { listQuotes } from '@/lib/quotes';
import { PACKAGE_BRANDS, brandLabel } from '@/lib/brands';
import QuotesTable from '@/components/admin/QuotesTable';

export const dynamic = 'force-dynamic';

export default async function BrandQuotesPage({ params }: { params: { brand: string } }) {
  const brandKey = params.brand;
  if (!PACKAGE_BRANDS.some((b) => b.key === brandKey)) notFound();

  const db = createAdminClient();
  const [{ data: pkgRows }, allQuotes] = await Promise.all([
    db.from('packages').select('id').eq('brand', brandKey),
    listQuotes(),
  ]);
  const brandPackageIds = new Set((pkgRows ?? []).map((p) => p.id));
  const quotes = allQuotes.filter((q) => q.packageId && brandPackageIds.has(q.packageId));
  const unlinked = allQuotes.length - allQuotes.filter((q) => q.packageId).length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Premium Choice {brandLabel(brandKey)}</p>
          <h1 className="font-serif text-3xl text-ink">Quotes</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Quotes built from {brandLabel(brandKey)} packages.
            {unlinked > 0 && (
              <> {unlinked} quote{unlinked === 1 ? '' : 's'} without a linked package live under{' '}
              <Link href="/admin/quotes" className="font-semibold text-teal-deep hover:underline">all quotes</Link>.</>
            )}
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
