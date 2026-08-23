import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SectionHeading from '@/components/SectionHeading';
import PackageCard from '@/components/PackageCard';
import BrandGrid from '@/components/BrandGrid';
import HeroSlideshow from '@/components/HeroSlideshow';
import DifferenceBand from '@/components/DifferenceBand';
import { getDestinations, getPublishedPackages } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [destinations, packages] = await Promise.all([getDestinations(), getPublishedPackages()]);

  const topDestinations = destinations
    .filter((d) => d.region !== 'Cruise Seas')
    .sort((a, b) => a.priorityRank - b.priorityRank)
    .slice(0, 6);

  const featuredJourneys = packages.filter((p) => p.featured).slice(0, 6);

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="relative flex min-h-[92svh] items-center">
        <HeroSlideshow />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/70" />
        <div className="container-site relative pb-16 pt-28 text-white">
          <p className="eyebrow !text-teal">One trusted travel company · Dubai</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            There’s a world of <em className="not-italic text-teal">choice</em>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
            Holidays, cruises, staycations, school travel, golf and corporate travel —
            all backed by the experience and personal service of Premium Choice Travel.
          </p>

          {/* Dual path */}
          <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
            <a
              href="https://premiumchoiceholidays.com/destinations"
              target="_blank"
              rel="noopener"
              className="group rounded-xl border border-white/25 bg-ink/40 px-4 py-3 backdrop-blur transition-colors hover:border-teal"
            >
              <p className="text-xs text-white/70">Know where you want to go?</p>
              <p className="mt-0.5 font-serif text-lg text-white group-hover:text-teal">
                Explore destinations <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </p>
            </a>
            <a
              href="https://premiumchoiceholidays.com/inspiration"
              target="_blank"
              rel="noopener"
              className="group rounded-xl border border-teal/60 bg-teal/20 px-4 py-3 backdrop-blur transition-colors hover:bg-teal"
            >
              <p className="text-xs text-white/80">No idea where to start?</p>
              <p className="mt-0.5 font-serif text-lg text-white">
                ✨ Inspire me
              </p>
            </a>
          </div>
          <Link href="/about" className="mt-6 inline-block text-sm font-semibold text-white/70 underline-offset-4 hover:text-teal hover:underline">
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
            <a href="https://premiumchoiceholidays.com/destinations" target="_blank" rel="noopener" className="btn-outline shrink-0">
              All 65 destinations
            </a>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-6">
            {topDestinations.map((d) => (
              <a
                key={d.slug}
                href={`https://premiumchoiceholidays.com/destinations/${d.slug}`}
                target="_blank"
                rel="noopener"
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl"
              >
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
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Our Brands */}
      <section className="bg-sand py-16 sm:py-20">
        <div className="container-site">
          <SectionHeading
            eyebrow="Our brands"
            title="One name. Six ways to travel."
            text="Whatever takes you away, there is a Premium Choice specialist ready to make it happen."
            center
          />
          <div className="mt-12">
            <BrandGrid />
          </div>
        </div>
      </section>

      {/* Journeys we're excited about */}
      {featuredJourneys.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Journeys we’re excited about"
                title="Starting points, not set menus"
                text="Open one for the full day-by-day plan — then let a specialist reshape it around you."
              />
              <Link href="/journeys" className="btn-outline shrink-0">
                All journeys
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredJourneys.map((pkg, i) => (
                <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} external />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Difference */}
      <DifferenceBand />

      {/* Founder */}
      <section className="py-16 sm:py-20">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-sand lg:order-2">
            <Image src="/images/paul-farrell.jpg" alt="Paul Farrell, founder of Premium Choice Travel" fill className="object-cover object-top" sizes="(max-width: 1024px) 100vw, 50vw" />
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
                That conviction has grown into a family of specialist travel businesses —
                holidays, school travel, staycations, cruises, golf and corporate — each
                run the way Paul believes travel should be: personally, knowledgeably,
                and with someone you can actually reach.
              </p>
            </div>
            <Link href="/about" className="mt-7 inline-block text-sm font-bold text-teal-deep hover:underline">
              Our story →
            </Link>
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
            <div className="mt-6 flex flex-wrap gap-4">
              <a href="https://premiumchoiceholidays.com/inspiration" target="_blank" rel="noopener" className="btn-primary !px-7 !py-3.5">✨ Give me some inspiration</a>
              <Link href="/ai-inspiration" className="btn-outline !bg-white !px-7 !py-3.5">How it works</Link>
            </div>
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
                <Link href="/plan" className="btn-primary !px-9 !py-4 !text-base">
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
