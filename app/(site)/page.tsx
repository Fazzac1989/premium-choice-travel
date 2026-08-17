import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SectionHeading from '@/components/SectionHeading';
import PackageCard from '@/components/PackageCard';
import DestinationCard from '@/components/DestinationCard';
import { getDestinations, getFeaturedPackages } from '@/lib/data';
import { sampleTestimonials, SERVICES } from '@/lib/sample-data';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [featured, destinations] = await Promise.all([getFeaturedPackages(), getDestinations()]);

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="relative flex min-h-[92svh] items-center">
        <Image
          src="/images/hero.jpg"
          alt="White sand beach with leaning palm trees over turquoise water"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/20 to-ink/60" />
        <div className="container-site relative pt-24 pb-16 text-white">
          <p className="eyebrow !text-teal">Tailor-made travel from the UAE</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
            Holidays crafted around <em className="text-teal not-italic">you</em>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
            Maldives escapes, Caucasus adventures, Japan in cherry-blossom season —
            planned by real specialists in Dubai and priced without the guesswork.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/packages" className="btn-primary !px-8 !py-4 !text-base">
              Explore packages
            </Link>
            <Link href="/contact" className="btn !border !border-white/40 !px-8 !py-4 !text-base text-white hover:!border-teal hover:text-teal">
              Talk to a specialist
            </Link>
          </div>
          <div className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/20 pt-7">
            {[
              ['15+', 'years of UAE travel expertise'],
              ['40+', 'destinations, hand-picked'],
              ['24/7', 'support while you travel'],
            ].map(([n, label]) => (
              <div key={label}>
                <p className="font-serif text-3xl text-teal">{n}</p>
                <p className="mt-1 text-xs leading-snug text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured packages */}
      <section className="py-20 sm:py-24">
        <div className="container-site">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Featured packages"
              title="Trips our clients are booking right now"
              text="Every package is a starting point — dates, hotels and pace are shaped around you."
            />
            <Link href="/packages" className="btn-outline shrink-0">
              View all packages
            </Link>
          </div>
          <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((pkg, i) => (
              <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} />
            ))}
          </div>
        </div>
      </section>

      {/* Destinations */}
      <section className="bg-sand py-20 sm:py-24">
        <div className="container-site">
          <SectionHeading
            eyebrow="Destinations"
            title="Where will it be?"
            text="From four-hour getaways to far-flung adventures — these are the places we know street by street, reef by reef."
            center
          />
          <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {destinations.slice(0, 4).map((d) => (
              <DestinationCard key={d.slug} destination={d} tall />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {destinations.slice(4, 7).map((d) => (
              <DestinationCard key={d.slug} destination={d} />
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 sm:py-24">
        <div className="container-site">
          <SectionHeading
            eyebrow="Beyond the package"
            title="One call covers everything"
            text="We're a full-service agency — the extras that make a trip effortless are all under one roof."
          />
          <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="border-t-2 border-teal pt-5">
                <h3 className="font-serif text-xl text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us / testimonials */}
      <section className="bg-ink py-20 text-white sm:py-24">
        <div className="container-site">
          <SectionHeading
            eyebrow="Why Premium Choice"
            title="Real people, remarkable trips"
            light
            center
          />
          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {sampleTestimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-7">
                <div className="flex gap-1 text-teal" aria-label="5 star review">
                  {'★★★★★'.split('').map((s, i) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-white/85">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className="block text-xs text-white/60">{t.trip}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-24">
        <div className="container-site">
          <div className="relative overflow-hidden rounded-3xl">
            <Image
              src="/images/hero.jpg"
              alt=""
              fill
              className="object-cover object-bottom"
              sizes="(max-width: 1240px) 100vw, 1240px"
            />
            <div className="absolute inset-0 bg-ink/60" />
            <div className="relative px-8 py-16 text-center text-white sm:px-16 sm:py-20">
              <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-5xl">
                Tell us where you’re dreaming of.
                <span className="text-teal"> We’ll do the rest.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-white/80">
                Share a few details and a specialist will send you a personal quote —
                usually within one working day.
              </p>
              <Link href="/contact" className="btn-primary mt-8 !px-9 !py-4 !text-base">
                Start planning — it’s free
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
