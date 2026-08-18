import { notFound } from 'next/navigation';
import { PACKAGE_BRANDS, brandLabel } from '@/lib/brands';
import HotelsManager from '@/components/admin/HotelsManager';

export const dynamic = 'force-dynamic';

export default function BrandHotelsPage({ params }: { params: { brand: string } }) {
  if (!PACKAGE_BRANDS.some((b) => b.key === params.brand)) notFound();

  return (
    <>
      <p className="eyebrow">Premium Choice {brandLabel(params.brand)}</p>
      <h1 className="font-serif text-3xl text-ink">Hotels we rate</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Hotels are shared across the whole family — add or edit here and every brand can
        link them to journey stages.
      </p>
      <HotelsManager />
    </>
  );
}
