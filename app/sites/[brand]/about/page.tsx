import { notFound } from 'next/navigation';
import OurStory from '@/components/OurStory';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand) return {};
  return {
    title: 'Our story',
    description: `${brand.name} is part of Premium Choice Travel — a family-owned, Dubai-based travel company built on four decades of experience and British roots.`,
  };
}

export default function BrandAboutPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();
  const base = brandBase(brand);

  return (
    <main>
      <OurStory brandName={brand.name} contactHref={`${base}/enquire`} variant={brand.key} />
    </main>
  );
}
