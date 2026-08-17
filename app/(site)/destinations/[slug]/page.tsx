import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import PackageCard from '@/components/PackageCard';
import { getDestination, getPackagesForDestination } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function DestinationPage({ params }: { params: { slug: string } }) {
  const destination = await getDestination(params.slug);
  if (!destination) notFound();
  const packages = await getPackagesForDestination(destination.slug);

  return (
    <>
      <SiteHeader />
      <section className="relative flex min-h-[56svh] items-end">
        <Image src={destination.heroImage} alt={destination.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-site relative pb-12 pt-40 text-white">
          <p className="eyebrow !text-teal">{destination.region}</p>
          <h1 className="mt-3 font-serif text-5xl sm:text-6xl">{destination.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{destination.blurb}</p>
        </div>
      </section>

      <main className="container-site py-14 sm:py-16">
        {packages.length > 0 ? (
          <>
            <h2 className="font-serif text-3xl text-ink">Our {destination.name} packages</h2>
            <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((p, i) => (
                <PackageCard key={p.slug} pkg={p} priority={i < 3} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-line p-12 text-center">
            <p className="font-serif text-2xl text-ink">We build {destination.name} trips to order.</p>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">
              Tell us your dates and style and we’ll craft a personal itinerary with transparent pricing.
            </p>
            <Link href="/contact" className="btn-primary mt-6">Request a tailor-made quote</Link>
          </div>
        )}
      </main>
    </>
  );
}
