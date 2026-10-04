import Image from 'next/image';
import Link from 'next/link';
import type { Brand } from '@/lib/brands';
import type { Package } from '@/lib/types';
import type { Offer } from '@/lib/offers-shared';
import GolfCard from '@/components/golf/GolfCard';
import OfferCard from '@/components/OfferCard';
import WhatsAppLink from '@/components/WhatsAppLink';
import { GOLF_LENGTHS, GOLF_TRIP_TYPES, golfFacts, golfGeography } from '@/lib/golf/catalogue';

/**
 * The golf front page. A short hero with the search in it, so the first
 * screen carries a proposition and something to do; then ways in by kind of
 * trip, by time available and by party; then real trips. The header already
 * carries the logo, so the hero does not repeat it.
 */
export default function GolfHome({
  brand,
  base,
  packages,
  offers,
}: {
  brand: Brand;
  base: string;
  packages: Package[];
  offers: Offer[];
}) {
  const journeys = `${base}/journeys`;
  const geography = golfGeography(packages);
  const typeCounts = new Map<string, number>();
  for (const p of packages) {
    const t = golfFacts(p).tripType;
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const types = GOLF_TRIP_TYPES.filter((t) => typeCounts.has(t.key));
  const featured = [...packages].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 6);
  const shortCount = packages.filter((p) => p.nights <= 4).length;
  const uaeCount = packages.filter((p) => golfFacts(p).region === 'UAE & Oman').length;

  return (
    <>
      <section className="relative flex min-h-[64svh] items-end">
        <Image src={brand.heroImage} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/30 to-ink/75" />
        <div className="container-site relative pb-10 pt-28 text-white">
          <p className="eyebrow !text-teal">Golf holidays from the UAE</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-[1.08] sm:text-5xl">{brand.tagline}</h1>
          <p className="mt-4 max-w-xl text-white/85">
            Named courses, nights, rounds and board on every trip — from a drive-to weekend to a week in Belek.
          </p>

          <form action={journeys} method="get" role="search"
            className="mt-7 grid gap-3 rounded-2xl bg-white p-4 text-ink shadow-2xl shadow-ink/30 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
            <div>
              <label className="field-label" htmlFor="gh-where">Where</label>
              <select id="gh-where" name="region" className="field" defaultValue="">
                <option value="">Anywhere</option>
                {geography.map((g) => (
                  <option key={g.region} value={g.region}>{g.region}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="gh-length">How long</label>
              <select id="gh-length" name="length" className="field" defaultValue="">
                <option value="">Any length</option>
                {GOLF_LENGTHS.map((l) => (
                  <option key={l.key} value={l.key}>{l.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="gh-type">Kind of trip</label>
              <select id="gh-type" name="type" className="field" defaultValue="">
                <option value="">Any kind</option>
                {types.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary self-end !py-3 sm:col-span-2 lg:col-span-1">
              Find golf trips
            </button>
          </form>
        </div>
      </section>

      {/* Ways in: by time available and by party */}
      <section className="border-b border-line bg-sand">
        <div className="container-site grid gap-4 py-8 sm:grid-cols-3">
          <EntryTile href={`${journeys}?length=short`} title="Golf breaks" body={`${shortCount} trips of two to four nights — little or no leave needed.`} />
          <EntryTile href={`${journeys}?region=${encodeURIComponent('UAE & Oman')}`} title="Play close to home" body={`${uaeCount} UAE and Oman trips, most with no flight at all.`} />
          <EntryTile href={`${base}/groups`} title="Groups and societies" body="One per-person quote, rooming worked out, tee times requested together." />
        </div>
      </section>

      {/* What kind of trip — each opens its own results, not a form */}
      <section className="py-14 sm:py-16">
        <div className="container-site">
          <p className="eyebrow">Browse by kind of trip</p>
          <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">What kind of golf trip?</h2>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {types.map((t) => (
              <Link key={t.key} href={`${journeys}?type=${t.key}`}
                className="group rounded-2xl border border-line bg-white p-5 transition-colors hover:border-teal-deep">
                <p className="font-semibold text-ink group-hover:text-teal-deep">{t.label}</p>
                <p className="mt-1 text-sm text-ink-soft">{typeCounts.get(t.key)} {typeCounts.get(t.key) === 1 ? 'trip' : 'trips'} →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {offers.length > 0 && (
        <section className="border-t border-line bg-sand py-14 sm:py-16">
          <div className="container-site">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-3xl text-ink sm:text-4xl">Current golf offers</h2>
              <Link href={`${base}/offers`} className="shrink-0 text-sm font-semibold text-teal-deep hover:underline">All offers →</Link>
            </div>
            <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {offers.slice(0, 3).map((o) => (
                <OfferCard key={o.id} offer={o} enquireBase={base} />
              ))}
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="border-t border-line py-14 sm:py-16">
          <div className="container-site">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <p className="eyebrow">Golf holidays</p>
                <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">Trips to start from</h2>
              </div>
              <Link href={journeys} className="shrink-0 text-sm font-semibold text-teal-deep hover:underline">
                All {packages.length} trips →
              </Link>
            </div>
            <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p, i) => (
                <GolfCard key={p.slug} pkg={p} href={`${journeys}/${p.slug}`} priority={i < 3} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* By destination */}
      <section className="border-t border-line bg-sand py-14 sm:py-16">
        <div className="container-site">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-3xl text-ink sm:text-4xl">Where to play</h2>
            <Link href={`${base}/destinations`} className="shrink-0 text-sm font-semibold text-teal-deep hover:underline">All destinations →</Link>
          </div>
          <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {geography.map((g) => (
              <div key={g.region}>
                <Link href={`${journeys}?region=${encodeURIComponent(g.region)}`} className="font-semibold text-ink hover:text-teal-deep">
                  {g.region}
                </Link>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {g.countries.map((c, i) => (
                    <span key={c.slug}>
                      {i > 0 && ' · '}
                      <Link href={`${journeys}?country=${c.slug}`} className="hover:text-teal-deep hover:underline">{c.country}</Link>
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="container-site grid items-center gap-8 rounded-3xl bg-petrol-deep p-8 text-white sm:p-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl">Not sure where to start?</h2>
            <p className="mt-3 max-w-xl text-white/80">
              Tell a golf specialist your dates, how many are playing and what you want from the trip.
              We come back with options costed for your dates — and tell you what each club has confirmed.
            </p>
          </div>
          <div className="space-y-3">
            <Link href={`${base}/enquire`} className="btn-primary w-full !py-3">Send us your trip brief</Link>
            <a href="tel:+97144206965" className="btn w-full !border !border-white/40 !py-3 text-white hover:!border-teal hover:text-teal">
              Call +971 4 420 6965
            </a>
            <WhatsAppLink className="!border-white/40 !text-white" text="Hello, I'd like help planning a golf trip. " />
          </div>
        </div>
      </section>
    </>
  );
}

function EntryTile({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-line bg-white p-5 transition-colors hover:border-teal-deep">
      <p className="font-serif text-xl text-ink group-hover:text-teal-deep">{title} →</p>
      <p className="mt-1 text-sm text-ink-soft">{body}</p>
    </Link>
  );
}
