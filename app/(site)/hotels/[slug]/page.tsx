import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import PackageCard from '@/components/PackageCard';
import GalleryLightbox from '@/components/GalleryLightbox';
import { getDestinations, getHotelBySlug } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const result = await getHotelBySlug(params.slug);
  if (!result) return {};
  const { hotel } = result;
  return {
    title: `${hotel.name}${hotel.area ? ` — ${hotel.area}` : ''}`,
    description: hotel.description || hotel.intro[0]?.slice(0, 155) || `${hotel.name}, one of the hotels our specialists rate.`,
  };
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-3xl text-ink">{title}</h2>
    </>
  );
}

export default async function HotelPage({ params }: { params: { slug: string } }) {
  const result = await getHotelBySlug(params.slug);
  if (!result) notFound();
  const { hotel, journeys } = result;

  const destinations = await getDestinations();
  const destination = destinations.find((d) => d.id === hotel.destinationId) ?? null;
  const heroImage = hotel.image || hotel.gallery[0] || destination?.heroImage || '';

  const facts: [string, string][] = [
    ...(destination ? [['Destination', destination.name] as [string, string]] : []),
    ...(hotel.area ? [['Area', hotel.area] as [string, string]] : []),
    ...(hotel.style ? [['Style', hotel.style] as [string, string]] : []),
    ...(hotel.transferDuration ? [['Transfer', hotel.transferDuration] as [string, string]] : []),
    ...(hotel.mealPlans.length ? [['Meal plans', hotel.mealPlans.join(' · ')] as [string, string]] : []),
  ];

  return (
    <>
      <SiteHeader />
      <section className="relative flex min-h-[56svh] items-end">
        {heroImage && (
          <Image src={heroImage} alt={hotel.name} fill priority className="object-cover" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-site relative pb-12 pt-36 text-white">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <Link href="/" className="hover:text-teal">Home</Link> ›{' '}
            {destination ? (
              <>
                <Link href={`/destinations/${destination.slug}`} className="hover:text-teal">{destination.name}</Link> ›{' '}
              </>
            ) : null}
            <span className="text-white">{hotel.name}</span>
          </nav>
          <p className="eyebrow mt-4 !text-teal">
            {[destination?.name, hotel.area, hotel.style].filter(Boolean).join(' · ')}
          </p>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{hotel.name}</h1>
          {!hotel.image && !hotel.gallery.length && destination && (
            <p className="mt-2 text-xs text-white/60">Destination photography shown — hotel imagery coming soon.</p>
          )}
        </div>
      </section>

      {/* Facts bar */}
      {facts.length > 0 && (
        <div className="border-b border-line bg-sand">
          <div className="container-site flex flex-wrap gap-x-12 gap-y-4 py-5">
            {facts.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="container-site grid gap-14 py-14 lg:grid-cols-[1fr_360px] lg:gap-20">
        <div className="min-w-0">
          {/* Introduction */}
          <SectionTitle eyebrow="Our take" title={`Why we rate ${hotel.name}`} />
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-soft">
            {(hotel.intro.length ? hotel.intro : [hotel.description]).filter(Boolean).map((para: string, i: number) => (
              <p key={i} className={i === 0 ? 'font-serif text-xl leading-relaxed text-ink' : ''}>
                {para}
              </p>
            ))}
            {!hotel.intro.length && !hotel.description && (
              <p>Our specialists know this property first-hand — ask us where it fits in your plans.</p>
            )}
          </div>

          {/* Features */}
          {hotel.features.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="At a glance" title="Features" />
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {hotel.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-sand px-4 py-3 text-sm text-ink">
                    <span className="mt-0.5 text-teal">✦</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Room types */}
          {hotel.roomTypes.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="Sleep" title="Room types" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {hotel.roomTypes.map((r: { heading: string; body: string }, i: number) => (
                  <div key={i} className="rounded-2xl border border-line p-5">
                    <h3 className="font-serif text-lg text-teal-deep">{r.heading}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{r.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Room categories and configurations are confirmed by your specialist for your dates and party.
              </p>
            </div>
          )}

          {/* Restaurants */}
          {hotel.restaurants.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="Eat & drink" title="Restaurants & bars" />
              <div className="mt-6 space-y-6">
                {hotel.restaurants.map((r: { heading: string; body: string }, i: number) => (
                  <div key={i} className="border-l-2 border-teal pl-6">
                    <h3 className="font-serif text-xl text-ink">{r.heading}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Getting there */}
          {(hotel.gettingThere || hotel.transferDuration) && (
            <div className="mt-12">
              <SectionTitle eyebrow="The journey in" title="Getting there" />
              <div className="mt-5 rounded-2xl bg-sand p-6">
                {hotel.gettingThere && (
                  <p className="text-[15px] leading-relaxed text-ink-soft">{hotel.gettingThere}</p>
                )}
                {hotel.transferDuration && (
                  <p className="mt-2 text-sm font-semibold text-teal-deep">
                    Transfer time: {hotel.transferDuration}
                  </p>
                )}
                <p className="mt-2 text-xs text-ink-soft">
                  Transfers are arranged as part of your quote.
                </p>
              </div>
            </div>
          )}

          {/* Gallery */}
          {hotel.gallery.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="Gallery" title={`${hotel.name}, in pictures`} />
              <div className="mt-7">
                <GalleryLightbox
                  images={hotel.gallery.map((url: string) => ({ url, alt: hotel.name }))}
                  title={hotel.name}
                />
              </div>
            </div>
          )}

          {/* Journeys */}
          {journeys.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="Featured in" title="Journeys that stay here" />
              <div className="mt-7 grid gap-7 sm:grid-cols-2">
                {journeys.map((p) => (
                  <PackageCard key={p.slug} pkg={p} external />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-ink p-7 text-white">
            <h3 className="font-serif text-xl">Ask us about {hotel.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Dates, room categories, meal plans, family setups — a specialist confirms
              what’s possible and prices it properly.
            </p>
            <Link href="/plan" className="btn-primary mt-5 w-full">Plan my trip</Link>
            <p className="mt-4 text-center text-xs text-white/60">
              or call <a className="font-semibold text-teal" href="tel:+97144206965">+971 4 420 6965</a>
            </p>
          </div>
          {destination && (
            <Link
              href={`/destinations/${destination.slug}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-2xl"
            >
              <Image src={destination.heroImage} alt={destination.name} fill sizes="360px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">Destination guide</p>
                <p className="mt-1 font-serif text-2xl text-white">{destination.name} →</p>
              </div>
            </Link>
          )}
        </aside>
      </main>
    </>
  );
}
