import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PackageCard from '@/components/PackageCard';
import SectionHeading from '@/components/SectionHeading';
import DifferenceBand from '@/components/DifferenceBand';
import HeroSlideshow from '@/components/HeroSlideshow';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestinations, getPackagesByBrand, getStaycationHotels, hotelSlug } from '@/lib/data';

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
  const isStaycations = brand.slug === 'staycations';

  // Staycations sells hotels, not packages.
  const allBrandPackages = brand.sellsPackages && !isStaycations ? await getPackagesByBrand(brand.key) : [];
  // Featured journeys lead, exactly like the master homepage.
  const packages = [...allBrandPackages].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 6);
  const hotels = isStaycations ? (await getStaycationHotels()).slice(0, 6) : [];
  const holidayDestinations = isHolidays
    ? (await getDestinations()).filter((d) => d.region !== 'Cruise Seas')
    : [];
  const topDestinations = [...holidayDestinations]
    .sort((a, b) => a.priorityRank - b.priorityRank)
    .slice(0, 6);

  // Premium Choice Holidays clones the master front page — same hero slideshow,
  // same section rhythm — with the brands section left out.
  if (isHolidays) {
    return (
      <>
        {/* Hero — identical to the master site */}
        <section className="relative flex min-h-[92svh] items-center">
          <HeroSlideshow />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/70" />
          <div className="container-site relative pb-16 pt-28 text-white">
            <p className="eyebrow !text-teal">A Premium Choice Travel brand · Dubai</p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Your holiday. <em className="not-italic text-teal">Your way.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
              Tailor-made holidays, city breaks, beach escapes and extraordinary journeys
              around the world — planned by real specialists in Dubai.
            </p>

            {/* Dual path */}
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
            <Link href={`${base}/about`} className="mt-6 inline-block text-sm font-semibold text-white/70 underline-offset-4 hover:text-teal hover:underline">
              Our story →
            </Link>
          </div>
        </section>

        {/* Where to go now */}
        <section className="py-16 sm:py-20">
          <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Where to go now"
                title="The places our specialists are booking"
              />
              <Link href={`${base}/destinations`} className="btn-outline shrink-0">
                All {holidayDestinations.length} destinations
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

        {/* Journeys we're excited about */}
        {packages.length > 0 && (
          <section className="bg-sand py-16 sm:py-20">
            <div className="container-site">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <SectionHeading
                  eyebrow="Journeys we’re excited about"
                  title="Starting points, not set menus"
                  text="Open one for the full day-by-day plan — then let a specialist reshape it around you."
                />
                <Link href={`${base}/journeys`} className="btn-outline shrink-0 !bg-white">
                  All journeys
                </Link>
              </div>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg, i) => (
                  <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} hrefBase={`${base}/journeys`} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Difference */}
        <DifferenceBand planHref={`${base}/enquire`} />

        {/* Founder */}
        <section id="founder" className="py-16 sm:py-20">
          <div className="container-site grid items-center gap-12 lg:grid-cols-2">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-sand lg:order-2">
              <Image src="/images/paul-farrell-golf.jpg" alt="Paul Farrell, founder of Premium Choice Travel" fill className="object-cover object-top" sizes="(max-width: 1024px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
              <div className="absolute bottom-0 p-6">
                <p className="font-serif text-2xl text-white">Paul Farrell</p>
                <p className="text-sm text-white/75">Founder, Premium Choice Travel</p>
              </div>
            </div>
            <div>
              <p className="eyebrow">Our founder</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-5xl">
                Travel has always been personal.
              </h2>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft">
                <p>
                  Premium Choice Travel was founded in Dubai by Paul Farrell on a simple
                  conviction: the difference between a good trip and a great one is the
                  person who plans it.
                </p>
                <p>
                  Premium Choice Holidays carries that conviction into tailor-made travel —
                  holidays planned personally, knowledgeably, by someone you can actually
                  reach.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI inspiration band */}
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

        {/* CTA */}
        <section className="py-16 sm:py-20">
          <div className="container-site">
            <div className="relative overflow-hidden rounded-3xl">
              <Image src="/images/hero.jpg" alt="" fill className="object-cover object-bottom" sizes="(max-width: 1240px) 100vw, 1240px" />
              <div className="absolute inset-0 bg-ink/60" />
              <div className="relative px-8 py-16 text-center text-white sm:px-16 sm:py-20">
                <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-5xl">
                  Let’s make your next trip happen.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-white/80">
                  Tell us where you want to go — or simply what kind of experience you’re
                  looking for. A specialist replies quickly — typically within one working day.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Link href={`${base}/enquire`} className="btn-primary !px-9 !py-4 !text-base">
                    Start planning
                  </Link>
                  <a href="tel:+97144206965" className="btn !border !border-white/40 !px-9 !py-4 !text-base text-white hover:!border-teal hover:text-teal">
                    Call +971 4 420 6965
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* Hero — mirrors the master site */}
      <section className="relative flex min-h-[92svh] items-center">
        <Image src={brand.heroImage} alt={brand.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/70" />
        <div className="container-site relative pb-16 pt-28 text-white">
          {/* Staycations leads with the photograph — the logo is already in the header. */}
          {brand.logoCard && !isStaycations && (
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

          <div className="mt-8 flex flex-wrap gap-4">
            {brand.sellsPackages && (
              <Link href={isStaycations ? `${base}/hotels` : `${base}/journeys`} className="btn-primary !px-6 !py-3">
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

      {/* Featured hotels — Staycations sells hotels, not packages */}
      {hotels.length > 0 && (
        <section className="bg-sand py-16 sm:py-20">
          <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Hotels we rate"
                title="The UAE, hand-picked"
                text="Filter by emirate, star rating and meal plan — then tell us your dates."
              />
              <Link href={`${base}/hotels`} className="btn-outline shrink-0 !bg-white">
                All hotels
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hotels.map((h) => (
                <Link
                  key={h.id}
                  href={`${base}/hotels/${hotelSlug(h.name)}`}
                  className="card group overflow-hidden transition-shadow hover:shadow-xl hover:shadow-ink/10"
                >
                  <div className="relative aspect-[16/10] bg-ink">
                    {h.image || h.gallery[0] ? (
                      <Image
                        src={h.image || h.gallery[0]}
                        alt={h.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink to-teal-deep/60 p-6">
                        <p className="text-center font-serif text-2xl leading-snug text-white/90">{h.name}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-serif text-xl leading-snug text-ink group-hover:text-teal-deep">{h.name}</h3>
                      {h.stars ? <span className="text-[13px] tracking-[0.1em] text-teal-deep">{'★'.repeat(h.stars)}</span> : null}
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-teal-deep">
                      {[h.emirate, h.area].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured journeys */}
      {packages.length > 0 && (
        <section className="bg-sand py-16 sm:py-20">
          <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Journeys we’re excited about"
                title="Starting points, not set menus"
                text="Open one for the full plan — then let a specialist reshape it around you."
              />
              <Link href={`${base}/journeys`} className="btn-outline shrink-0 !bg-white">
                All journeys
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg, i) => (
                <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} hrefBase={`${base}/journeys`} />
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
