import { notFound } from 'next/navigation';
import OffersManager from '@/components/admin/OffersManager';
import { getBrand } from '@/lib/brands';
import { OFFER_SITES, type OfferBrand } from '@/lib/offers';

export const dynamic = 'force-dynamic';

export default function BrandOffersPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || !(OFFER_SITES as readonly string[]).includes(brand.key)) notFound();

  return (
    <>
      <h1 className="font-serif text-3xl text-ink">{brand.name} offers</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What the {brand.name} site shows on its Offers page: this brand&apos;s own offers and the
        ones for every brand.
      </p>
      <OffersManager brand={brand.key as OfferBrand} />
    </>
  );
}
