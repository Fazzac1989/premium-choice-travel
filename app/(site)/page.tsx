import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SectionHeading from '@/components/SectionHeading';
import PackageCard from '@/components/PackageCard';
import BrandGrid from '@/components/BrandGrid';
import { getHomepageBrandSections } from '@/lib/data';
import { BRANDS, getBrand } from '@/lib/brands';

export const dynamic = 'force-dynamic';

const DIFFERENCE = [
  {
    title: 'Personal',
    text: 'Real people who take the time to understand how you want to travel — and answer when you call.',
  },
  {
    title: 'Experienced',
    text: 'Travel knowledge built through years in the industry, from Gulf staycations to round-the-world itineraries.',
  },
  {
    title: 'Specialist',
    text: 'Six dedicated travel brands, each built around a different way to travel — never one-size-fits-all.',
  },
  {
    title: 'Connected',
    text: 'A Dubai base with hand-picked partners in destinations around the world.',
  },
  {
    title: 'Here when you need us',
    text: 'Personal assistance before, during and after your booking — especially when plans change.',
  },
];

const SECTION_INTRO: Record<string, { eyebrow: string; title: string; text: string }> = {
  holidays: {
    eyebrow: 'Premium Choice Holidays',
    title: 'Holidays, made yours',
    text: 'Tailor-made escapes our specialists are booking right now — every one reshapeable around your dates and budget.',
  },
  golf: {
    eyebrow: 'Premium Choice Golf Holidays',
    title: 'Where will golf take you?',
    text: 'Course-first golf trips with guaranteed tee times — links, winter sun and golf-plus-beach combinations.',
  },
  cruises: {
    eyebrow: 'Premium Choice Cruise',
    title: 'See more. Unpack once.',
    text: 'From Gulf sailings on your doorstep to the Mediterranean and the fjords — flights and transfers bundled in.',
  },
  staycations: {
    eyebrow: 'Premium Choice Staycations',
    title: 'The UAE. Rediscovered.',
    text: 'Preferred rates at the Emirates’ finest resorts, usually with breakfast, late checkout or resort credit thrown in.',
  },
};

export default async function HomePage() {
  const sections = await getHomepageBrandSections();

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
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/brands" className="btn-primary !px-8 !py-4 !text-base">
              Explore our brands
            </Link>
            <Link href="/plan" className="btn !border !border-white/40 !px-8 !py-4 !text-base text-white hover:!border-teal hover:text-teal">
              Plan my trip
            </Link>
          </div>
          {/* Brand selector chips */}
          <div className="mt-12 flex flex-wrap gap-2.5">
            {BRANDS.map((b) =>
              b.externalUrl ? (
                <a
                  key={b.slug}
                  href={b.externalUrl}
                  target="_blank"
                  rel="noopener"
                  className="rounded-full border border-white/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/85 backdrop-blur transition-colors hover:border-teal hover:text-teal"
                >
                  {b.shortName}
                </a>
              ) : (
                <Link
                  key={b.slug}
                  href={`/brands/${b.slug}`}
                  className="rounded-full border border-white/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/85 backdrop-blur transition-colors hover:border-teal hover:text-teal"
                >
                  {b.shortName}
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* Editorial intro */}
      <section className="py-20 sm:py-24">
        <div className="container-site grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="eyebrow">Introducing Premium Choice Travel</p>
            <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight text-ink sm:text-5xl">
              Travel is what we know. Personal service is what we’re known for.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft">
              Premium Choice Travel is a Dubai-based travel company behind a family of
              specialist travel brands. Whether it’s a Maldives holiday, a school
              expedition, a weekend up the coast or a company on the move, the same
              principle applies: a real specialist listens first, designs second, and
              stays reachable until you’re home.
            </p>
            <Link href="/about" className="mt-7 inline-block text-sm font-bold text-teal-deep hover:underline">
              Discover our story →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['6', 'specialist travel brands'],
              ['40+', 'destinations, hand-picked'],
              ['Dubai', 'based & UAE-licensed'],
              ['1', 'point of contact, always'],
            ].map(([n, label]) => (
              <div key={label} className="rounded-2xl bg-sand p-6">
                <p className="font-serif text-3xl text-teal-deep">{n}</p>
                <p className="mt-1 text-sm leading-snug text-ink-soft">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Brands */}
      <section className="bg-sand py-20 sm:py-24">
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

      {/* Brand package sections */}
      {sections.map(({ brand, packages }) => {
        const meta = SECTION_INTRO[brand];
        const brandDef = BRANDS.find((b) => b.key === brand);
        if (!meta || packages.length === 0) return null;
        return (
          <section key={brand} className="py-16 sm:py-20 odd:bg-white even:bg-sand/60">
            <div className="container-site">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <SectionHeading eyebrow={meta.eyebrow} title={meta.title} text={meta.text} />
                {brandDef && (
                  <Link href={`/brands/${brandDef.slug}`} className="btn-outline shrink-0 !bg-white">
                    {brandDef.cta}
                  </Link>
                )}
              </div>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {packages.map((pkg) => (
                  <PackageCard key={pkg.slug} pkg={pkg} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Difference */}
      <section className="bg-ink py-20 text-white sm:py-24">
        <div className="container-site">
          <SectionHeading
            eyebrow="The Premium Choice difference"
            title="Why travellers stay with us"
            light
            center
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENCE.map((d) => (
              <div key={d.title} className="border-t-2 border-teal pt-5">
                <h3 className="font-serif text-xl text-white">{d.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{d.text}</p>
              </div>
            ))}
            <div className="border-t-2 border-teal pt-5">
              <h3 className="font-serif text-xl text-teal">Talk to a travel expert</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Not sure where to start? Tell us what kind of experience you’re after and
                we’ll shape it with you.
              </p>
              <Link href="/plan" className="mt-3 inline-block text-sm font-bold text-teal hover:underline">
                Start planning →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="py-20 sm:py-24">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-sand lg:order-2">
            <Image src="/images/hero.jpg" alt="" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
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

      {/* CTA */}
      <section className="pb-20 sm:pb-24">
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
                looking for. A specialist replies within one working day.
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
