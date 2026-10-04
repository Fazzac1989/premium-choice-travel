import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PackageCard from '@/components/PackageCard';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestinations, getPackagesByBrand } from '@/lib/data';
import GolfCatalogue from '@/components/golf/GolfCatalogue';
import { parseGolfCriteria } from '@/lib/golf/catalogue';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({ params, searchParams }: { params: { brand: string }; searchParams: SearchParams }) {
  if (getBrand(params.brand)?.key !== 'golf') return { title: 'Our trips' };
  const short = parseGolfCriteria(searchParams).length === 'short';
  return {
    title: short ? 'Golf breaks of two to four nights' : 'Golf holidays from the UAE',
    description: short
      ? 'Short golf breaks for UAE residents: named courses, nights, rounds and board on every trip.'
      : 'Search golf holidays by destination, nights, rounds, board, month and trip type — every trip shows where you stay and what is included.',
  };
}

export default async function BrandPackagesPage({
  params,
  searchParams = {},
}: {
  params: { brand: string };
  searchParams?: SearchParams;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();
  const base = brandBase(brand);

  // Holidays sells holidays, and sells them by kind rather than as one long
  // list. The old address still works so nothing already linked to it breaks;
  // individual holidays stay at /journeys/<slug> and are untouched.
  if (brand.slug === 'holidays') redirect(`${base}/holidays`);

  const packages = await getPackagesByBrand(brand.key);

  // Golf is searched and filtered rather than read as one long list.
  if (brand.key === 'golf') {
    const destinations = await getDestinations();
    return (
      <GolfCatalogue
        base={base}
        packages={packages}
        criteria={parseGolfCriteria(searchParams)}
        seasonality={Object.fromEntries(destinations.map((d) => [d.slug, d.seasonality]))}
      />
    );
  }

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-14 sm:py-16">
          <p className="eyebrow">{brand.name}</p>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">Our trips</h1>
          <p className="mt-4 max-w-xl text-ink-soft">
            Starting points, not set menus — every itinerary reshapes around your dates, pace and budget.
          </p>
        </div>
      </section>
      <section className="py-14 sm:py-16">
        <div className="container-site">
          {packages.length === 0 ? (
            <div className="rounded-2xl border border-line p-12 text-center">
              <p className="font-serif text-2xl text-ink">We build every trip to order.</p>
              <p className="mx-auto mt-3 max-w-md text-ink-soft">
                Tell us what you have in mind and we’ll craft a personal itinerary with transparent pricing.
              </p>
              <Link href={`${base}/enquire`} className="btn-primary mt-6">Request a tailor-made quote</Link>
            </div>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg, i) => (
                <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} hrefBase={`${base}/journeys`} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
