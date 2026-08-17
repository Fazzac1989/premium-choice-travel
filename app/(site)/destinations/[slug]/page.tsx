import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import PackageCard from '@/components/PackageCard';
import { getDestination, getPackagesForDestination } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function DestinationPage({ params }: { params: { slug: string } }) {
  const destination = await getDestination(params.slug);
  if (!destination) notFound();
  const packages = await getPackagesForDestination(destination.slug);

  const hasGuide =
    destination.intro.length > 0 ||
    destination.whenToTravel.length > 0 ||
    destination.culture.length > 0;

  return (
    <>
      <SiteHeader />
      <section className="relative flex min-h-[60svh] items-end">
        <Image src={destination.heroImage} alt={destination.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-site relative pb-12 pt-40 text-white">
          <p className="eyebrow !text-teal">{destination.region} · Destination guide</p>
          <h1 className="mt-3 font-serif text-5xl sm:text-6xl">{destination.name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{destination.blurb}</p>
        </div>
      </section>

      {/* Guide */}
      {hasGuide && (
        <section className="py-14 sm:py-16">
          <div className="container-site grid gap-14 lg:grid-cols-[1fr_360px] lg:gap-20">
            <div className="min-w-0">
              {destination.intro.length > 0 && (
                <div className="space-y-4 text-[15px] leading-relaxed text-ink-soft">
                  {destination.intro.map((para, i) => (
                    <p key={i} className={i === 0 ? 'font-serif text-xl leading-relaxed text-ink' : ''}>
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {destination.whenToTravel.length > 0 && (
                <div className="mt-12">
                  <p className="eyebrow">Seasons</p>
                  <h2 className="mt-1 font-serif text-3xl text-ink">When to travel</h2>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {destination.whenToTravel.map((s, i) => (
                      <div key={i} className="rounded-2xl bg-sand p-6">
                        <h3 className="font-serif text-lg text-teal-deep">{s.heading}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {destination.culture.length > 0 && (
                <div className="mt-12">
                  <p className="eyebrow">Know before you go</p>
                  <h2 className="mt-1 font-serif text-3xl text-ink">Culture & flavour</h2>
                  <div className="mt-6 space-y-8">
                    {destination.culture.map((s, i) => (
                      <div key={i} className="border-l-2 border-teal pl-6">
                        <h3 className="font-serif text-xl text-ink">{s.heading}</h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl bg-ink p-7 text-white">
                <h3 className="font-serif text-xl">Talk to a {destination.name} specialist</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  First-hand advice on islands, seasons and the details guidebooks miss.
                </p>
                <Link href="/plan" className="btn-primary mt-5 w-full">Plan my trip</Link>
                <p className="mt-4 text-center text-xs text-white/60">
                  or call <a className="font-semibold text-teal" href="tel:+97144206965">+971 4 420 6965</a>
                </p>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* Sample itineraries */}
      <section className={`py-14 sm:py-16 ${hasGuide ? 'border-t border-line bg-sand' : ''}`}>
        <div className="container-site">
          {packages.length > 0 ? (
            <>
              <p className="eyebrow">Sample itineraries</p>
              <h2 className="mt-1 font-serif text-3xl text-ink">Trips we run to {destination.name}</h2>
              <p className="mt-3 max-w-xl text-sm text-ink-soft">
                Each itinerary is a proven starting point — open one for the full day-by-day plan,
                then let us reshape it around you.
              </p>
              <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {packages.map((p, i) => (
                  <PackageCard key={p.slug} pkg={p} priority={i < 3} />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-line bg-white p-12 text-center">
              <p className="font-serif text-2xl text-ink">We build {destination.name} trips to order.</p>
              <p className="mx-auto mt-3 max-w-md text-ink-soft">
                Tell us your dates and style and we’ll craft a personal itinerary with transparent pricing.
              </p>
              <Link href="/plan" className="btn-primary mt-6">Request a tailor-made quote</Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
