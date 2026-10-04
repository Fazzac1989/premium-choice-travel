import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PackageCard from '@/components/PackageCard';
import HolidaySearchPanel from '@/components/holidays/HolidaySearchPanel';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestinations, getPackagesByBrand } from '@/lib/data';
import {
  ALL_COLLECTIONS,
  collectionBySlug,
  groupsWithContent,
  packagesIn,
} from '@/lib/holidays/collections';

export async function generateStaticParams() {
  return ALL_COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const c = collectionBySlug(params.slug);
  if (!c) return { title: 'Holidays' };
  return { title: c.title, description: c.blurb };
}

/**
 * One kind of holiday.
 *
 * The list is whatever matches the collection's rule in lib/holidays/collections
 * — no hand-picked ordering per page, so adding a holiday to the catalogue puts
 * it in front of the right people without anybody remembering to.
 */
export default async function HolidayCollectionPage({
  params,
}: {
  params: { brand: string; slug: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'holidays') notFound();
  const collection = collectionBySlug(params.slug);
  if (!collection) notFound();
  const base = brandBase(brand);

  const [packages, destinations] = await Promise.all([
    getPackagesByBrand(brand.key),
    getDestinations(),
  ]);
  const matches = packagesIn(collection, packages);
  const siblings = groupsWithContent(packages)
    .flatMap((g) => g.items)
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 8);

  return (
    <>
      <section className="bg-cloud">
        <div className="container-site py-12 sm:py-14">
          <Link
            href={`${base}/holidays`}
            className="text-sm font-bold text-slate-soft underline-offset-4 hover:text-flame hover:underline"
          >
            &larr; All holidays
          </Link>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.02em] text-slate sm:text-5xl">
            {collection.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] text-slate-soft">{collection.blurb}</p>
          <p className="mt-2 text-sm font-bold text-slate">
            {matches.length} {matches.length === 1 ? 'holiday' : 'holidays'}
          </p>
        </div>
      </section>

      <section className="border-b border-cloud-line bg-white">
        <div className="container-site py-5">
          <HolidaySearchPanel
            suggestions={destinations.map((d) => ({ name: d.name, region: d.region }))}
            action={`${base}/search`}
            compact
          />
        </div>
      </section>

      <section className="container-site py-12">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-cloud-line bg-white px-6 py-14 text-center">
            <h2 className="text-2xl font-extrabold text-slate">Nothing here yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-soft">
              We build these to order. Tell us what you have in mind and a specialist will put
              something together.
            </p>
            <Link
              href={`${base}/enquire`}
              className="mt-5 inline-block rounded-full bg-flame px-6 py-3 text-sm font-bold text-white hover:bg-flame-deep"
            >
              Plan my trip
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((p) => (
              <PackageCard key={p.id} pkg={p} hrefBase={`${base}/journeys`} />
            ))}
          </div>
        )}
      </section>

      {/* Every holiday here is a starting point, so the way out is a person. */}
      <section className="bg-slate py-12 text-white">
        <div className="container-site flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Not quite it?</h2>
            <p className="mt-1 max-w-xl text-sm text-white/75">
              Every holiday we sell is reshaped around your dates, your rooms and who is coming.
              Tell us what you are picturing.
            </p>
          </div>
          <Link
            href={`${base}/enquire`}
            className="shrink-0 rounded-full bg-sun px-6 py-3 text-sm font-bold text-slate hover:bg-sun-deep"
          >
            Plan my trip
          </Link>
        </div>
      </section>

      {siblings.length > 0 ? (
        <section className="container-site py-12">
          <h2 className="text-xl font-extrabold text-slate">Other kinds of holiday</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {siblings.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`${base}/holidays/${c.slug}`}
                  className="inline-block rounded-full border border-cloud-line bg-white px-4 py-2 text-sm font-bold text-slate hover:border-flame hover:text-flame"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
