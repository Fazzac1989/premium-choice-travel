import Image from 'next/image';
import Link from 'next/link';
import type { Package } from '@/lib/types';
import { golfFacts, golfGeography } from '@/lib/golf/catalogue';

/**
 * Golf by geography: the one region → country tree, built from the trips that
 * actually exist, each country opening its filtered list. A country's picture
 * is the photograph of one of its own trips, never a generic stock image.
 */
export default function GolfDestinations({ base, packages }: { base: string; packages: Package[] }) {
  const geography = golfGeography(packages);
  const pictureFor = (countrySlug: string) =>
    packages.find((p) => golfFacts(p).countrySlug === countrySlug && p.heroImage)?.heroImage ?? null;
  const nightsFor = (countrySlug: string) => {
    const n = packages.filter((p) => golfFacts(p).countrySlug === countrySlug).map((p) => p.nights);
    const lo = Math.min(...n);
    const hi = Math.max(...n);
    return lo === hi ? `${lo} nights` : `${lo}–${hi} nights`;
  };

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-12 sm:py-14">
          <p className="eyebrow">Golf destinations</p>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">Where to play</h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            From a drive-to weekend in the UAE to links golf in Scotland. Choose a country to see its trips,
            or{' '}
            <Link href={`${base}/journeys`} className="font-semibold text-teal-deep hover:underline">search every golf holiday</Link>.
          </p>
          <nav aria-label="Regions" className="mt-6 flex flex-wrap gap-2">
            {geography.map((g) => (
              <a key={g.region} href={`#${encodeURIComponent(g.region)}`}
                className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-ink hover:border-teal-deep">
                {g.region}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="container-site space-y-14 py-12 sm:py-14">
        {geography.map((g) => (
          <section key={g.region} id={encodeURIComponent(g.region)} className="scroll-mt-28">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-3xl text-ink">{g.region}</h2>
              <Link href={`${base}/journeys?region=${encodeURIComponent(g.region)}`}
                className="shrink-0 text-sm font-semibold text-teal-deep hover:underline">
                All {g.countries.reduce((n, c) => n + c.count, 0)} trips →
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {g.countries.map((c) => {
                const img = pictureFor(c.slug);
                return (
                  <Link key={c.slug} href={`${base}/journeys?country=${c.slug}`}
                    className="group card overflow-hidden transition-shadow hover:shadow-xl hover:shadow-ink/10">
                    <div className="relative aspect-[4/3] bg-sand">
                      {img && (
                        <Image src={img} alt={`Golf in ${c.country}`} fill sizes="(max-width: 768px) 100vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-serif text-xl text-ink group-hover:text-teal-deep">{c.country}</h3>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {c.count} {c.count === 1 ? 'trip' : 'trips'} · {nightsFor(c.slug)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
