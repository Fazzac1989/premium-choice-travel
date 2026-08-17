import { notFound } from 'next/navigation';
import BrandHeader from '@/components/brand-site/BrandHeader';
import BrandFooter from '@/components/brand-site/BrandFooter';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand) return {};
  return {
    title: { default: brand.name, template: `%s — ${brand.name}` },
    description: brand.description,
  };
}

export default function BrandSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { brand: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();
  const base = brandBase(brand);

  return (
    <>
      <BrandHeader base={base} name={brand.name} logoWhite={brand.logoWhite} />
      {children}
      <BrandFooter name={brand.name} description={brand.description} logoWhite={brand.logoWhite} />
    </>
  );
}
