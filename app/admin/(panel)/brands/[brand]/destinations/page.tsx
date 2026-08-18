import { notFound } from 'next/navigation';
import { PACKAGE_BRANDS, brandLabel } from '@/lib/brands';
import DestinationsManager from '@/components/admin/DestinationsManager';

export const dynamic = 'force-dynamic';

export default function BrandDestinationsAdminPage({ params }: { params: { brand: string } }) {
  if (!PACKAGE_BRANDS.some((b) => b.key === params.brand)) notFound();

  return (
    <>
      <p className="eyebrow">Premium Choice {brandLabel(params.brand)}</p>
      <h1 className="font-serif text-3xl text-ink">Destinations</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Destination guides are shared across the whole family — an edit here updates every
        brand website that shows the destination.
      </p>
      <DestinationsManager />
    </>
  );
}
