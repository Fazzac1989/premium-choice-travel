import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import PackageDetailBody from '@/components/PackageDetailBody';
import { getDestination, getJourneyStays, getPackage, getRelatedJourneys } from '@/lib/data';
import { durationLabel } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const pkg = await getPackage(params.slug);
  if (!pkg || pkg.status !== 'published') return {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    title: pkg.seoTitle || `${pkg.title} — ${pkg.destinationName} holiday from Dubai`,
    description: pkg.seoDescription || pkg.tagline || pkg.overview[0]?.slice(0, 155),
    alternates: { canonical: `${siteUrl}/journeys/${pkg.slug}` },
    openGraph: {
      title: `${pkg.title} | Premium Choice Travel`,
      description: pkg.tagline,
      images: pkg.heroImage ? [{ url: pkg.heroImage }] : undefined,
    },
  };
}

export default async function JourneyPage({ params }: { params: { slug: string } }) {
  const pkg = await getPackage(params.slug);
  if (!pkg || pkg.status !== 'published') notFound();

  const [related, stays, destination] = await Promise.all([
    getRelatedJourneys(pkg),
    getJourneyStays(pkg),
    pkg.destinationSlug ? getDestination(pkg.destinationSlug) : Promise.resolve(null),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const tripSchema = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: pkg.title,
    description: pkg.tagline,
    touristType: pkg.category || undefined,
    itinerary: pkg.itinerary.map((d) => ({
      '@type': 'TouristAttraction',
      name: d.title || d.label,
      description: d.description,
    })),
    provider: {
      '@type': 'TravelAgency',
      name: 'Premium Choice Travel',
      url: siteUrl,
    },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Journeys', item: `${siteUrl}/journeys` },
      { '@type': 'ListItem', position: 3, name: pkg.title, item: `${siteUrl}/journeys/${pkg.slug}` },
    ],
  };

  return (
    <>
      <SiteHeader />
      <section className="relative flex min-h-[62svh] items-end">
        <Image src={pkg.heroImage} alt={pkg.title} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-site relative pb-12 pt-40 text-white">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <Link href="/" className="hover:text-teal">Home</Link> ›{' '}
            <Link href="/journeys" className="hover:text-teal">Journeys</Link> ›{' '}
            <span className="text-white">{pkg.title}</span>
          </nav>
          <p className="eyebrow mt-4 !text-teal">
            <Link href={`/destinations/${pkg.destinationSlug}`} className="hover:underline">
              {pkg.destinationName}
            </Link>{' '}
            · {pkg.category} · {durationLabel(pkg)}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{pkg.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{pkg.tagline}</p>
        </div>
      </section>
      <PackageDetailBody
        pkg={pkg}
        related={related}
        hrefBase="/journeys"
        externalCards
        hotels={stays.hotels}
        experiences={stays.experiences}
        destination={destination}
        destinationHref={destination ? `/destinations/${destination.slug}` : undefined}
        hotelBase="/hotels"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tripSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    </>
  );
}
