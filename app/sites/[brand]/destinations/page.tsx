import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestinations } from '@/lib/data';
import type { Destination } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Destinations' };

const STYLE_FILTERS = [
  'Beach', 'Family', 'Couples', 'Culture', 'Adventure', 'Wildlife', 'Safari',
  'Golf', 'Ski', 'Wellness', 'City Break', 'Nature', 'Islands',
];

const REGION_ORDER = [
  'Indian Ocean', 'Asia', 'Europe', 'Europe / Asia', 'Middle East', 'Caucasus',
  'Africa', 'Africa / Middle East', 'North America', 'Central America', 'Oceania',
];

function DestinationTile({ d, base }: { d: Destination; base: string }) {
  return (
    <Link href={`${base}/destinations/${d.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl">
      <Image
        src={d.heroImage}
        alt={d.name}
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3 className="font-serif text-xl text-white sm:text-2xl">{d.name}</h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-white/70">{d.strapline || d.blurb}</p>
      </div>
    </Link>
  );
}

export default async function BrandDestinationsPage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: { region?: string; style?: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'holidays') notFound();
  const base = brandBase(brand);

  const all = (await getDestinations()).filter((d) => d.region !== 'Cruise Seas');
  const region = searchParams.region ?? '';
  const style = searchParams.style ?? '';

  const filtered = all.filter(
    (d) =>
      (!region || d.region === region) &&
      (!style || d.tags.some((t) => t.toLowerCase().includes(style.toLowerCase())))
  );

  const regions = REGION_ORDER.filter((r) => all.some((d) => d.region === r));
  const filterHref = (r: string, s: string) => {
    const q = new URLSearchParams();
    if (r) q.set('region', r);
    if (s) q.set('style', s);
    const qs = q.toString();
    return qs ? `${base}/destinations?${qs}` : `${base}/destinations`;
  };

  const grouped = REGION_ORDER.map((r) => ({
    region: r,
    items: filtered.filter((d) => d.region === r),
  })).filter((g) => g.items.length > 0);

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-14 sm:py-16">
          <p className="eyebrow">{brand.name}</p>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Where will you go next?
          </h1>
          <p className="mt-4 max-w-xl text-ink-soft">
            {all.length} destinations, hand-picked for travellers from the UAE.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href={filterHref('', style)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${!region ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
            >
              All regions
            </Link>
            {regions.map((r) => (
              <Link
                key={r}
                href={filterHref(r, style)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${region === r ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
              >
                {r}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={filterHref(region, '')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${!style ? 'bg-teal text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
            >
              All styles
            </Link>
            {STYLE_FILTERS.map((s) => (
              <Link
                key={s}
                href={filterHref(region, s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${style === s ? 'bg-teal text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-14">
        <div className="container-site space-y-14">
          {grouped.length === 0 && (
            <div className="rounded-2xl border border-line p-12 text-center">
              <p className="font-serif text-2xl text-ink">Nothing matches that combination — yet.</p>
              <p className="mt-3 text-ink-soft">Tell us what you have in mind and we’ll build it.</p>
              <Link href={`${base}/enquire`} className="btn-primary mt-6">Plan my trip</Link>
            </div>
          )}
          {grouped.map(({ region: r, items }) => (
            <div key={r}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-2xl text-ink sm:text-3xl">{r}</h2>
                <p className="text-xs text-ink-soft">{items.length} destination{items.length === 1 ? '' : 's'}</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                {items.map((d) => (
                  <DestinationTile key={d.slug} d={d} base={base} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
