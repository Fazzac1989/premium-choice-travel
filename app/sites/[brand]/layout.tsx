import { notFound } from 'next/navigation';
import BrandHeader, { type HeaderDestinationGroup } from '@/components/brand-site/BrandHeader';
import BrandFooter from '@/components/brand-site/BrandFooter';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestinations } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand) return {};
  return {
    title: { default: brand.name, template: `%s — ${brand.name}` },
    description: brand.description,
  };
}

/** Regions and per-region cap for the landscape destinations dropdown. */
const DROPDOWN_REGIONS = ['Indian Ocean', 'Asia', 'Europe', 'Middle East', 'Africa'];

export default async function BrandSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { brand: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();
  const base = brandBase(brand);
  const isHolidays = brand.slug === 'holidays';

  let destinationGroups: HeaderDestinationGroup[] = [];
  if (isHolidays) {
    const all = (await getDestinations()).filter((d) => d.region !== 'Cruise Seas');
    destinationGroups = DROPDOWN_REGIONS.map((region) => ({
      region,
      items: all
        .filter((d) => d.region === region)
        .sort((a, b) => a.priorityRank - b.priorityRank)
        .slice(0, 8)
        .map((d) => ({ slug: d.slug, name: d.name })),
    })).filter((g) => g.items.length > 0);
  }

  return (
    <>
      <BrandHeader
        base={base}
        name={brand.name}
        logo={brand.logo}
        logoWhite={brand.logoWhite}
        isHolidays={isHolidays}
        destinationGroups={destinationGroups}
      />
      {children}
      <BrandFooter
        name={brand.name}
        description={brand.description}
        logoWhite={brand.logoWhite}
        base={base}
        isHolidays={isHolidays}
      />
    </>
  );
}
