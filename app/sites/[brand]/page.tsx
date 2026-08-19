import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PackageCard from '@/components/PackageCard';
import SectionHeading from '@/components/SectionHeading';
import DifferenceBand from '@/components/DifferenceBand';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestinations, getPackagesByBrand } from '@/lib/data';

export const dynamic = 'force-dynamic';

const CORPORATE_SERVICES = [
  ['Corporate travel', 'Flights, hotels and ground transport for business travellers — booked, changed and supported by people who know your account.'],
  ['Group travel', 'Conferences, team off-sites and group movements handled end to end.'],
  ['Meetings & events', 'Venues, delegate travel and accommodation in the UAE and abroad.'],
  ['Incentive travel', 'Reward trips people actually talk about — designed around your team.'],
  ['Account management', 'One named contact, agreed service levels and clear reporting.'],
  ['Out-of-hours support', 'When plans change mid-trip, your travellers reach a person who can fix it.'],
];

export default async function BrandHomePage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();
  const base = brandBase(brand);
  const isHolidays = brand.slug === 'holidays';

  const packages = brand.sellsPackages ? await getPackagesByBrand(brand.key, 6) : [];
  const topDestinations = isHolidays
    ? (await getDestinations())
        .filter((d) => d.region !== 'Cruise Seas')
        .sort((a, b) => a.priorityRank - b.priorityRank)
        .slice(0, 6)
    : [];

  return (
    <>
      {/* Hero — mirrors the master site */}
      <section className="relative flex min-h-[92svh] items-center">
        <Image src={brand.heroImage} alt={brand.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/70" />
        <div className="container-site relative pb-16 pt-28 text-white">
          {brand.logoCard && (
            <Image
              src={brand.logoCard}
              alt={brand.name}
              width={560}
              height={155}
              priority
              className="mb-7 h-24 w-auto max-w-full rounded-xl shadow-2xl shadow-ink/40 sm:h-28"
            />
          )}
          <p className="eyebrow !text-teal">A Premium Choice Travel brand · Dubai</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl">{brand.tagline}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">{brand.description}</p>

          {isHolidays ? (
            <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
              <Link
                href={`${base}/destinations`}
                className="group rounded-xl border border-white/25 bg-ink/40 px-4 py-3 backdrop-blur transition-colors hover:border-teal"
              >
                <p className="text-xs text-white/70">Know where you want to go?</p>
                <p className="mt-0.5 font-serif text-lg text-white group-hover:text-teal">
                  Explore destinations <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </p>
              </Link>
              <Link
                href={`${base}/inspiration`}
                className="group rounded-xl border border-teal/60 bg-teal/20 px-4 py-3 backdrop-blur transition-colors hover:bg-teal"
              >
                <p className="text-xs text-white/80">No idea where to start?</p>
                <p className="mt-0.5 font-serif text-lg text-white">✨ Inspire me</p>
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-4">
              {brand.sellsPackages && (
                <Link href={`${base}/packages`} className="btn-primary !px-6 !py-3">
                  {brand.cta}
                </Link>
              )}
              <Link
                href={`${base}/enquire`}
                className="btn !border !border-white/40 !px-6 !py-3 text-white hover:!border-teal hover:text-teal"
              >
                Talk to a specialist
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Intro + services */}
      <section className="py-16 sm:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="eyebrow">About {brand.shortName}</p>
            <h2 className="mt-2 max-w-xl font-serif text-3xl leading-tight text-ink sm:text-4xl">
              {brand.name}
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{brand.longDescription}</p>
          </div>
          <ul className="grid content-start gap-3">
            {brand.services.map((s) => (
              <li key={s} className="flex items-center gap-3 rounded-xl bg-sand px-4 py-3 text-sm font-semibold text-ink">
                <span className="text-teal">✦</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Where to go now — Holidays only, mirrors the master homepage */}
      {topDestinations.length > 0 && (
        <section className="bg-sand py-16 sm:py-20">
          <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Where to go now"
                title="The places our specialists are booking"
              />
              <Link href={`${base}/destinations`} className="btn-outline shrink-0 !bg-white">
                All destinations
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-6">
              {topDestinations.map((d) => (
                <Link key={d.slug} href={`${base}/destinations/${d.slug}`} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl">
                  <Image
                    src={d.heroImage}
                    alt={d.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-serif text-xl text-white">{d.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured journeys */}
      {packages.length > 0 && (
        <section className={`py-16 sm:py-20 ${isHolidays ? '' : 'bg-sand'}`}>
          <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Journeys we’re excited about"
                title="Starting points, not set menus"
                text="Open one for the full plan — then let a specialist reshape it around you."
              />
              <Link href={`${base}/packages`} className={`btn-outline shrink-0 ${isHolidays ? '' : '!bg-white'}`}>
                All journeys
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg, i) => (
                <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} hrefBase={`${base}/packages`} />
              ))}
            </div>
          </div>
        </section>
      )}

      {brand.key === 'corporate' && (
        <section className="bg-sand py-16 sm:py-20">
          <div className="container-site">
            <SectionHeading eyebrow="What we do" title="Corporate travel, end to end" />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CORPORATE_SERVICES.map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-line bg-white p-6">
                  <h3 className="font-serif text-xl text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* The Premium Choice difference — shared with the master site */}
      <DifferenceBand planHref={`${base}/enquire`} />

      {/* AI inspiration band — Holidays only */}
      {isHolidays && (
        <section className="bg-sand py-16 sm:py-20">
          <div className="container-site grid items-center gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="eyebrow">AI Inspiration</p>
              <h2 className="mt-2 max-w-xl font-serif text-3xl leading-tight text-ink sm:text-4xl">
                Sixty seconds from now, you could have three trips to argue about.
              </h2>
              <p className="mt-4 max-w-xl text-ink-soft">
                Tell our AI Holiday Curator how you like to travel and it sketches three
                genuinely different ideas — then a human specialist prices the one you love.
              </p>
              <Link href={`${base}/inspiration`} className="btn-primary mt-6 !px-7 !py-3.5">
                ✨ Give me some inspiration
              </Link>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6 shadow-xl shadow-ink/5">
              <p className="font-serif text-lg text-ink">“Somewhere warm in the Eid break, two kids, surprise us.”</p>
              <div className="mt-4 space-y-2">
                {['Thailand Beach & Kids’ Club Escape', 'Sri Lanka Beach & Wildlife Discovery', 'Maldives Island Family Retreat'].map((t) => (
                  <div key={t} className="flex items-center gap-2 rounded-lg bg-sand px-3.5 py-2.5 text-sm font-semibold text-ink">
                    <span className="text-teal">✦</span> {t}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-soft">Real output from the curator — ideas, never invented prices.</p>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="container-site">
          <div className="relative overflow-hidden rounded-3xl">
            <Image src={brand.heroImage} alt="" fill className="object-cover" sizes="(max-width: 1240px) 100vw, 1240px" />
            <div className="absolute inset-0 bg-ink/65" />
            <div className="relative px-8 py-14 text-center text-white sm:px-16 sm:py-16">
              <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
                Let’s make it happen.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/80">
                Tell us what you have in mind — a specialist replies typically within one working day.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                <Link href={`${base}/enquire`} className="btn-primary !px-8 !py-3.5">
                  Start planning
                </Link>
                <a href="tel:+97144206965" className="btn !border !border-white/40 !px-8 !py-3.5 text-white hover:!border-teal hover:text-teal">
                  +971 4 420 6965
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
