import Image from 'next/image';
import Link from 'next/link';
import PackageCard from '@/components/PackageCard';
import GalleryLightbox from '@/components/GalleryLightbox';
import SeasonalityBar from '@/components/SeasonalityBar';
import CalligraphyName from '@/components/CalligraphyName';
import type { Destination, Package } from '@/lib/types';

export type GuideLinks = {
  plan: string;
  inspire: string;
  destBase: string;
  pkgBase: string;
  home: string;
  destinationsLabel?: string;
};

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-3xl text-ink">{title}</h2>
    </>
  );
}

/** The full destination guide below the site header — shared between the
 *  master site and the Premium Choice Holidays brand site. */
export default function DestinationGuide({
  destination,
  packages,
  related,
  links,
}: {
  destination: Destination;
  packages: Package[];
  related: Destination[];
  links: GuideLinks;
}) {
  const packageTitles = new Set(packages.map((p) => p.title.toLowerCase()));
  const conceptIdeas = destination.journeyIdeas.filter((j) => !packageTitles.has(j.toLowerCase()));

  return (
    <>
      {/* Hero with hand-written country name */}
      <section className="relative flex min-h-[62svh] items-end">
        <Image src={destination.heroImage} alt={destination.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-site relative pb-12 pt-40 text-white">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <Link href={links.home} className="hover:text-teal">Home</Link> ›{' '}
            <Link href={links.destBase} className="hover:text-teal">{links.destinationsLabel ?? 'Destinations'}</Link> ›{' '}
            <span className="text-white">{destination.name}</span>
          </nav>
          <p className="eyebrow mt-4 !text-teal">{destination.region} · Destination guide</p>
          <h1 className="sr-only">{destination.name}</h1>
          <CalligraphyName name={destination.name} className="mt-1 text-white" />
          <p className="max-w-2xl font-serif text-2xl text-white/90">{destination.strapline}</p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a href="#holidays" className="btn-primary !px-7 !py-3.5">Explore holidays</a>
            <Link href={links.inspire} className="btn !border !border-teal/70 !bg-teal/20 !px-7 !py-3.5 text-white backdrop-blur hover:!bg-teal">
              ✨ Give me some inspiration
            </Link>
          </div>
          {destination.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {destination.tags.map((t) => (
                <span key={t} className="rounded-full border border-white/30 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white/85">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About + sidebar */}
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

            {destination.subDestinations.length > 0 && (
              <div className="mt-12">
                <SectionTitle eyebrow="Where to go" title={`Finding your ${destination.name}`} />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {destination.subDestinations.map((s, i) => (
                    <div key={i} className="rounded-2xl border border-line p-5">
                      <h3 className="font-serif text-lg text-teal-deep">{s.heading}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(destination.seasonality.best.length > 0 || destination.whenToTravel.length > 0) && (
              <div className="mt-12">
                <SectionTitle eyebrow="Seasons" title="When to go" />
                {destination.seasonality.best.length > 0 && (
                  <div className="mt-6">
                    <SeasonalityBar seasonality={destination.seasonality} />
                  </div>
                )}
                {destination.whenToTravel.length > 0 && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {destination.whenToTravel.map((s, i) => (
                      <div key={i} className="rounded-2xl bg-sand p-6">
                        <h3 className="font-serif text-lg text-teal-deep">{s.heading}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {destination.experiences.length > 0 && (
              <div className="mt-12">
                <SectionTitle eyebrow="Things to experience" title="Moments worth flying for" />
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {destination.experiences.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-sand px-4 py-3.5">
                      <span className="mt-0.5 text-teal">✦</span>
                      <div>
                        <h3 className="text-sm font-bold text-ink">{s.heading}</h3>
                        <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {destination.culture.length > 0 && (
              <div className="mt-12">
                <SectionTitle eyebrow="Know before you go" title="Culture & flavour" />
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

            {destination.stay.length > 0 && (
              <div className="mt-12">
                <SectionTitle eyebrow="Where to stay" title="Styles that suit" />
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {destination.stay.map((s, i) => (
                    <div key={i} className="rounded-2xl border border-line p-5">
                      <h3 className="font-serif text-lg text-teal-deep">{s.heading}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-soft">
                  We recommend specific hotels once we know your dates and party — availability and rates are always confirmed by a specialist.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-ink p-7 text-white">
              <h3 className="font-serif text-xl">Talk to a {destination.name} specialist</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                First-hand advice on regions, seasons and the details guidebooks miss —
                before any quote, without any obligation.
              </p>
              <Link href={links.plan} className="btn-primary mt-5 w-full">Plan my trip</Link>
              <p className="mt-4 text-center text-xs text-white/60">
                or call <a className="font-semibold text-teal" href="tel:+97144206965">+971 4 420 6965</a>
              </p>
            </div>
            <div className="rounded-2xl border border-teal/40 bg-teal/5 p-7">
              <h3 className="font-serif text-xl text-teal-deep">Not sure where to start?</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Answer a few questions and our AI curator sketches three trip ideas —
                then a human expert takes over.
              </p>
              <Link href={links.inspire} className="btn-dark mt-4 w-full">✨ Give me some inspiration</Link>
            </div>
          </aside>
        </div>
      </section>

      {/* Holidays */}
      <section id="holidays" className="border-t border-line bg-sand py-14 sm:py-16">
        <div className="container-site">
          <SectionTitle eyebrow="Popular holidays" title={`Trips we build to ${destination.name}`} />
          <p className="mt-3 max-w-xl text-sm text-ink-soft">
            Our itineraries are starting points, not fixed packages — open one for the full
            day-by-day plan, then let us reshape it around you.
          </p>
          {packages.length > 0 && (
            <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((p, i) => (
                <PackageCard key={p.slug} pkg={p} priority={i < 3} hrefBase={links.pkgBase} />
              ))}
            </div>
          )}
          {conceptIdeas.length > 0 && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {conceptIdeas.map((idea) => (
                <Link
                  key={idea}
                  href={links.plan}
                  className="group rounded-2xl border border-line bg-white p-5 transition-shadow hover:shadow-lg"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-deep">Holiday concept</p>
                  <h3 className="mt-1.5 font-serif text-lg leading-snug text-ink group-hover:text-teal-deep">{idea}</h3>
                  <p className="mt-2 text-xs text-ink-soft">Built to order — ask us to shape this trip →</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Gallery */}
      {destination.gallery.length > 0 && (
        <section className="py-14 sm:py-16">
          <div className="container-site">
            <SectionTitle eyebrow="Gallery" title={`${destination.name}, in pictures`} />
            <div className="mt-7">
              <GalleryLightbox images={destination.gallery} title={destination.name} />
            </div>
          </div>
        </section>
      )}

      {/* Related + closing CTA */}
      <section className="border-t border-line py-14 sm:py-16">
        <div className="container-site">
          {related.length > 0 && (
            <>
              <SectionTitle eyebrow="Keep exploring" title="You may also like" />
              <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
                {related.map((d) => (
                  <Link key={d.slug} href={`${links.destBase}/${d.slug}`} className="group relative block aspect-[4/3] overflow-hidden rounded-2xl">
                    <Image src={d.heroImage} alt={d.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">{d.region}</p>
                      <h3 className="mt-1 font-serif text-2xl text-white">{d.name}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="mt-12 rounded-3xl bg-ink px-8 py-12 text-center text-white sm:px-16">
            <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
              Ready when you are.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/75">
              Tell us your dates and your dream — a {destination.name} specialist replies within one working day.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link href={links.plan} className="btn-primary !px-8 !py-3.5">Start planning</Link>
              <Link href={links.inspire} className="btn !border !border-white/40 !px-8 !py-3.5 text-white hover:!border-teal hover:text-teal">
                ✨ Give me some inspiration
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
