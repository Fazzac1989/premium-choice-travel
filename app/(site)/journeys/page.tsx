import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PackageCard from '@/components/PackageCard';
import { getDestinations, getPublishedPackages } from '@/lib/data';
import { PACKAGE_BRANDS } from '@/lib/brands';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Journeys',
  description: 'Tailor-made journey ideas from Dubai and the UAE — starting points our specialists reshape around you.',
};

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: { destination?: string; brand?: string };
}) {
  const [packages, destinations] = await Promise.all([getPublishedPackages(), getDestinations()]);

  const destination = searchParams.destination ?? '';
  const brand = searchParams.brand ?? '';

  const filtered = packages.filter(
    (p) =>
      (!destination || p.destinationSlug === destination) &&
      (!brand || p.brand === brand)
  );

  const filterHref = (d: string, b: string) => {
    const q = new URLSearchParams();
    if (d) q.set('destination', d);
    if (b) q.set('brand', b);
    const s = q.toString();
    return s ? `/journeys?${s}` : '/journeys';
  };

  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site py-14 sm:py-16">
            <p className="eyebrow">Journeys</p>
            <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Starting points, not set menus
            </h1>
            <p className="mt-4 max-w-xl text-ink-soft">
              Every itinerary below can be reshaped — different dates, better rooms, an extra
              island. Prices are per person and refresh with the seasons.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href={filterHref(destination, '')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${!brand ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
              >
                All brands
              </Link>
              {PACKAGE_BRANDS.filter((b) => b.key !== 'corporate').map((b) => (
                <Link
                  key={b.key}
                  href={filterHref(destination, b.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${brand === b.key ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
                >
                  {b.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={filterHref('', brand)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${!destination ? 'bg-teal text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
              >
                All destinations
              </Link>
              {destinations.map((d) => (
                <Link
                  key={d.slug}
                  href={filterHref(d.slug, brand)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${destination === d.slug ? 'bg-teal text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
                >
                  {d.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-site">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-line p-12 text-center">
                <p className="font-serif text-2xl text-ink">Nothing matches that combination — yet.</p>
                <p className="mt-3 text-ink-soft">
                  We build trips to order every week. Tell us what you have in mind.
                </p>
                <Link href="/contact" className="btn-primary mt-6">Request a tailor-made quote</Link>
              </div>
            ) : (
              <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((pkg, i) => (
                  <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
