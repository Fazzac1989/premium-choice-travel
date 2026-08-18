import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import PackageCard from '@/components/PackageCard';
import { getDestinations, getHotelBySlug } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const result = await getHotelBySlug(params.slug);
  if (!result) return {};
  const { hotel } = result;
  return {
    title: `${hotel.name}${hotel.area ? ` — ${hotel.area}` : ''}`,
    description: hotel.description || `${hotel.name}, one of the hotels our specialists rate.`,
  };
}

export default async function HotelPage({ params }: { params: { slug: string } }) {
  const result = await getHotelBySlug(params.slug);
  if (!result) notFound();
  const { hotel, journeys } = result;

  const destinations = await getDestinations();
  const destination = destinations.find((d) => d.id === hotel.destinationId) ?? null;
  const heroImage = hotel.image || destination?.heroImage || '';

  return (
    <>
      <SiteHeader />
      <section className="relative flex min-h-[52svh] items-end">
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
          {!hotel.image && destination && (
            <p className="mt-2 text-xs text-white/60">Destination photography shown — hotel imagery coming soon.</p>
          )}
        </div>
      </section>

      <main className="container-site grid gap-14 py-14 lg:grid-cols-[1fr_360px] lg:gap-20">
        <div className="min-w-0">
          <p className="eyebrow">Why we rate it</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">Our take</h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            {hotel.description ||
              'Our specialists know this property first-hand — ask us where it fits in your plans.'}
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Rooms, rates and availability are always confirmed by a specialist in your
            written quote — and if this one isn’t the right fit, we’ll say so and suggest
            an alternative.
          </p>

          {journeys.length > 0 && (
            <div className="mt-12">
              <p className="eyebrow">Featured in</p>
              <h2 className="mt-1 font-serif text-3xl text-ink">Journeys that stay here</h2>
              <div className="mt-7 grid gap-7 sm:grid-cols-2">
                {journeys.map((p) => (
                  <PackageCard key={p.slug} pkg={p} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-ink p-7 text-white">
            <h3 className="font-serif text-xl">Ask us about {hotel.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Dates, room categories, family setups — a specialist will confirm what’s
              possible and price it properly.
            </p>
            <Link href="/plan" className="btn-primary mt-5 w-full">Plan my trip</Link>
            <p className="mt-4 text-center text-xs text-white/60">
              or call <a className="font-semibold text-teal" href="tel:+97144206965">+971 4 420 6965</a>
            </p>
          </div>
          {destination && (
            <Link
              href={`/destinations/${destination.slug}`}
              className="group relative mt-6 block aspect-[4/3] overflow-hidden rounded-2xl"
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
