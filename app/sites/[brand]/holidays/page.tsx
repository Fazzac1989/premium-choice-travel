import Link from 'next/link';
import { notFound } from 'next/navigation';
import PackageCard from '@/components/PackageCard';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getPackagesByBrand } from '@/lib/data';
import { groupsWithContent, packagesIn } from '@/lib/holidays/collections';

export const metadata = {
  title: 'Holidays',
  description:
    'All inclusive, beach, touring, safari and family holidays from Dubai, Abu Dhabi, Sharjah and Ras Al Khaimah.',
};

/**
 * The way in, for somebody who knows the kind of holiday they want but not
 * where. Collections with nothing in them are not offered.
 */
export default async function HolidaysIndexPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'holidays') notFound();
  const base = brandBase(brand);

  const packages = await getPackagesByBrand(brand.key);
  const groups = groupsWithContent(packages);
  const featured = [...packages]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 6);

  return (
    <>
      <section className="bg-cloud">
        <div className="container-site py-12 sm:py-16">
          <p className="eyebrow">Premium Choice Holidays</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.02em] text-slate sm:text-5xl">
            What kind of holiday?
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] text-slate-soft">
            {packages.length} holidays, every one a starting point. Pick the shape of the trip and we
            will fit the dates, the rooms and the flights around you.
          </p>
        </div>
      </section>

      <section className="container-site py-12">
        <div className="grid gap-10">
          {groups.map((group) => (
            <div key={group.heading}>
              <h2 className="text-xl font-extrabold text-slate">{group.heading}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((c) => {
                  const count = packagesIn(c, packages).length;
                  return (
                    <li key={c.slug}>
                      <Link
                        href={`${base}/holidays/${c.slug}`}
                        className="group flex h-full flex-col rounded-2xl border border-cloud-line bg-white p-5 transition-colors hover:border-flame"
                      >
                        <span className="text-[17px] font-extrabold text-slate group-hover:text-flame">
                          {c.title}
                        </span>
                        <span className="mt-1 flex-1 text-sm text-slate-soft">{c.blurb}</span>
                        <span className="mt-3 text-xs font-bold text-flame">
                          {count} {count === 1 ? 'holiday' : 'holidays'} →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cloud py-12">
        <div className="container-site">
          <h2 className="text-xl font-extrabold text-slate">Holidays we are booking most</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PackageCard key={p.id} pkg={p} hrefBase={`${base}/journeys`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
