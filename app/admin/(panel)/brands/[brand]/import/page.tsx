import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PACKAGE_BRANDS, brandLabel } from '@/lib/brands';
import ImportForm from '@/components/admin/ImportForm';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export default function BrandImportPage({ params }: { params: { brand: string } }) {
  if (!PACKAGE_BRANDS.some((b) => b.key === params.brand)) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/admin/brands/${params.brand}`} className="text-sm font-semibold text-teal-deep hover:underline">
        ← {brandLabel(params.brand)} overview
      </Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">AI package importer</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Upload a supplier document, paste a link, or paste the text — Claude drafts the
        package and files it under <strong>Premium Choice {brandLabel(params.brand)}</strong> for
        your review. Nothing is published until you say so.
      </p>
      <div className="mt-8">
        <ImportForm kind="package" defaultBrand={params.brand} />
      </div>
    </div>
  );
}
