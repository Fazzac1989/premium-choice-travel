import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { getDestinations } from '@/lib/data';
import type { Destination } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Destinations',
  description:
    'Explore 60+ destinations hand-picked for travellers from the UAE — beach, family, safari, golf, ski and city breaks, all planned by real specialists.',
};

const STYLE_FILTERS = [
  'Beach', 'Family', 'Couples', 'Culture', 'Adventure', 'Wildlife', 'Safari',
  'Golf', 'Ski', 'Wellness', 'City Break', 'Cruise', 'Nature', 'Islands',
];

const REGION_ORDER = [
  'Indian Ocean', 'Asia', 'Europe', 'Europe / Asia', 'Middle East', 'Caucasus',
  'Africa', 'Africa / Middle East', 'North America', 'Central America', 'Oceania', 'Cruise Seas',
];

function DestinationTile({ d, large = false }: { d: Destination; large?: boolean }) {
  return (
    <Link
      href={`/destinations/${d.slug}`}
      className={`group relative block overflow-hidden rounded-2xl ${large ? 'aspect-[3/4] sm:aspect-[4/3]' : 'aspect-[4/3]'}`}
    >
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

export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: { region?: string; style?: string };
}) {
  const all = await getDestinations();
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
    return qs ? `/destinations?${qs}` : '/destinations';
  };

  const grouped = REGION_ORDER.map((r) => ({
    region: r,
    items: filtered.filter((d) => d.region === r),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site py-14 sm:py-16">
            <p className="eyebrow">Destinations</p>
            <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Where will you go next?
            </h1>
            <p className="mt-4 max-w-xl text-ink-soft">
              {all.length} destinations, hand-picked for travellers from the UAE — every one
              backed by a specialist who has been there.
            </p>

            {/* Region filter */}
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
            {/* Style filter */}
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
                <Link href="/plan" className="btn-primary mt-6">Plan my trip</Link>
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
                    <DestinationTile key={d.slug} d={d} />
                  ))}
                </div>
              </div>
            ))}

            {/* Inspiration CTA */}
            <div className="rounded-3xl bg-ink px-8 py-12 text-center text-white sm:px-16">
              <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
                Can’t decide? Let’s narrow it down together.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/75">
                Answer a few questions and our AI curator sketches three trip ideas —
                then a human specialist prices the one you love.
              </p>
              <Link href="/inspiration" className="btn-primary mt-7 !px-8 !py-3.5">
                ✨ Give me some inspiration
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
