import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import DestinationGuide from '@/components/DestinationGuide';
import { getDestination, getDestinations, getPackagesForDestination } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const d = await getDestination(params.slug);
  if (!d) return {};
  return {
    title: `${d.name} holidays`,
    description: d.strapline ? `${d.strapline} ${d.blurb}` : d.blurb,
  };
}

export default async function DestinationPage({ params }: { params: { slug: string } }) {
  const destination = await getDestination(params.slug);
  if (!destination) notFound();
  const [packages, allDestinations] = await Promise.all([
    getPackagesForDestination(destination.slug),
    getDestinations(),
  ]);

  const related = allDestinations
    .filter((d) => d.slug !== destination.slug && d.region === destination.region)
    .slice(0, 3);

  return (
    <>
      <SiteHeader />
      <DestinationGuide
        destination={destination}
        packages={packages}
        related={related}
        links={{
          home: '/',
          plan: '/plan',
          inspire: `/inspiration?destination=${encodeURIComponent(destination.name)}`,
          destBase: '/destinations',
          pkgBase: '/journeys',
        }}
      />
    </>
  );
}
