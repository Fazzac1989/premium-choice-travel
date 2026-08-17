import SiteHeader from '@/components/SiteHeader';
import DestinationCard from '@/components/DestinationCard';
import { getDestinations } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Destinations' };

export default async function DestinationsPage() {
  const destinations = await getDestinations();

  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site py-14 sm:py-16">
            <p className="eyebrow">Destinations</p>
            <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              The places we know by heart
            </h1>
            <p className="mt-4 max-w-xl text-ink-soft">
              We only sell destinations we’ve walked ourselves — so every recommendation,
              from the room category to the restaurant table, comes from experience.
            </p>
          </div>
        </section>
        <section className="py-14 sm:py-16">
          <div className="container-site grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((d) => (
              <DestinationCard key={d.slug} destination={d} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
