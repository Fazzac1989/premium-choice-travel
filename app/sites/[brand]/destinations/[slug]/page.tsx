import { notFound } from 'next/navigation';
import DestinationGuide from '@/components/DestinationGuide';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestination, getDestinations, getPackagesForDestination } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string; slug: string } }) {
  const d = await getDestination(params.slug);
  if (!d) return {};
  return { title: `${d.name} holidays`, description: d.strapline ? `${d.strapline} ${d.blurb}` : d.blurb };
}

export default async function BrandDestinationPage({
  params,
}: {
  params: { brand: string; slug: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'holidays') notFound();
  const base = brandBase(brand);

  const destination = await getDestination(params.slug);
  if (!destination || destination.region === 'Cruise Seas') notFound();

  const [allPackages, allDestinations] = await Promise.all([
    getPackagesForDestination(destination.slug),
    getDestinations(),
  ]);
  // On the Holidays site, show this brand's packages for the destination.
  const packages = allPackages.filter((p) => p.brand === 'holidays');

  const related = allDestinations
    .filter((d) => d.slug !== destination.slug && d.region === destination.region && d.region !== 'Cruise Seas')
    .slice(0, 3);

  return (
    <DestinationGuide
      destination={destination}
      packages={packages}
      related={related}
      links={{
        home: base || '/',
        plan: `${base}/enquire`,
        inspire: `${base}/enquire`,
        destBase: `${base}/destinations`,
        pkgBase: `${base}/packages`,
      }}
    />
  );
}
