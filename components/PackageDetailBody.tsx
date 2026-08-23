import Image from 'next/image';
import Link from 'next/link';
import PackageCard from '@/components/PackageCard';
import EnquiryForm from '@/components/EnquiryForm';
import SeasonalityBar from '@/components/SeasonalityBar';
import type { Destination, Experience, Hotel, Package } from '@/lib/types';
import { durationLabel, formatPrice } from '@/lib/types';

/**
 * Everything below the hero on a journey page — shared between the master
 * site and each brand's own website.
 */
const hotelSlug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-');

export default function PackageDetailBody({
  pkg,
  related,
  hrefBase = '/journeys',
  hotels = [],
  experiences = [],
  destination = null,
  destinationHref,
  hotelBase,
  externalCards = false,
}: {
  pkg: Package;
  related: Package[];
  hrefBase?: string;
  hotels?: Hotel[];
  experiences?: Experience[];
  destination?: Destination | null;
  destinationHref?: string;
  /** When set (master site), hotel names/cards link to their own pages. */
  hotelBase?: string;
  externalCards?: boolean;
}) {
  const hotelById = new Map(hotels.map((h) => [h.id, h]));
  const experienceById = new Map(experiences.map((x) => [x.id, x]));
  const hotelHref = (h: Hotel) => (hotelBase ? `${hotelBase}/${hotelSlug(h.name)}` : null);
  const priceApproved = pkg.priceFrom !== null && (pkg.priceStatus === undefined || pkg.priceStatus === 'approved');
  const details = (pkg.details ?? {}) as Record<string, any>;
  const golfCourses = (details.courses ?? []) as { heading: string; body: string }[];
  const cruisePorts = (details.ports ?? []) as string[];
  return (
    <>
      {/* Facts bar */}
      <div className="border-b border-line bg-sand">
        <div className="container-site flex flex-wrap gap-x-12 gap-y-4 py-5">
          {[
            ['Duration', durationLabel(pkg)],
            ...(pkg.hotelName ? [['Stay', pkg.hotelName] as [string, string]] : []),
            ...(pkg.boardBasis ? [['Board', pkg.boardBasis] as [string, string]] : []),
            ...(pkg.brand === 'staycations' && details.emirate
              ? [['Emirate', String(details.emirate)] as [string, string]]
              : []),
            ...(pkg.brand === 'golf' && details.rounds
              ? [['Golf', `${details.rounds} rounds`] as [string, string]]
              : []),
            ...(pkg.brand === 'cruises' && details.cruiseRegion
              ? [['Cruise region', String(details.cruiseRegion)] as [string, string]]
              : []),
            ...(priceApproved
              ? [['From', `${formatPrice(pkg.currency, pkg.priceFrom!)} per person`] as [string, string]]
              : [['Price', 'On request'] as [string, string]]),
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{label}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <main className="container-site grid gap-14 py-14 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div className="min-w-0">
          <section>
            <p className="eyebrow">The trip</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">Overview</h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-soft">
              {pkg.overview.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {pkg.highlights.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Highlights</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {pkg.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-sand px-4 py-3 text-sm text-ink">
                    <span className="mt-0.5 text-teal">✦</span>
                    {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {((pkg.whoFor?.length ?? 0) > 0 || (pkg.whyWorks?.length ?? 0) > 0) && (
            <section className="mt-12 grid gap-6 sm:grid-cols-2">
              {(pkg.whoFor?.length ?? 0) > 0 && (
                <div className="rounded-2xl border border-line p-6">
                  <h3 className="font-serif text-xl text-ink">Who it suits</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
                    {pkg.whoFor!.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 text-teal">●</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(pkg.whyWorks?.length ?? 0) > 0 && (
                <div className="rounded-2xl border border-teal/30 bg-teal/5 p-6">
                  <h3 className="font-serif text-xl text-teal-deep">Why this journey works</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-ink">
                    {pkg.whyWorks!.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 font-bold text-teal">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {pkg.itinerary.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Day by day</h2>
              <ol className="mt-6 space-y-0">
                {pkg.itinerary.map((day, i) => {
                  const stayNames = (day.hotelIds ?? [])
                    .map((id) => hotelById.get(id))
                    .filter(Boolean) as Hotel[];
                  const dayExperiences = (day.experienceIds ?? [])
                    .map((id) => experienceById.get(id))
                    .filter(Boolean) as Experience[];
                  return (
                    <li key={i} className="relative border-l-2 border-teal/30 pb-8 pl-6 last:pb-0">
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-teal" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-deep">{day.label}</p>
                      <h3 className="mt-1 font-semibold text-ink">{day.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{day.description}</p>
                      {stayNames.length > 0 && (
                        <p className="mt-2 text-xs text-ink">
                          <span className="font-bold uppercase tracking-wider text-ink-soft">Stay:</span>{' '}
                          {stayNames.map((h, idx) => {
                            const href = hotelHref(h);
                            return (
                              <span key={h.id}>
                                {idx > 0 && ' · '}
                                {href ? (
                                  <Link href={href} className="font-semibold text-teal-deep hover:underline">{h.name}</Link>
                                ) : (
                                  h.name
                                )}
                              </span>
                            );
                          })}
                          <span className="text-ink-soft"> — or an alternative your specialist suggests</span>
                        </p>
                      )}
                      {dayExperiences.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {dayExperiences.map((x) => (
                            <span key={x.id} className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal-deep">
                              {x.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Golf detail */}
          {pkg.brand === 'golf' && (golfCourses.length > 0 || details.rounds) && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">The golf</h2>
              <div className="mt-4 flex flex-wrap gap-x-10 gap-y-3 rounded-2xl bg-sand p-5 text-sm">
                {(details.rounds || details.roundsNote) && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Rounds</p>
                    <p className="mt-0.5 font-semibold text-ink">{details.rounds || details.roundsNote}</p>
                  </div>
                )}
                {details.handicap && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Handicap</p>
                    <p className="mt-0.5 font-semibold text-ink">{details.handicap}</p>
                  </div>
                )}
                {details.buggies && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Buggies</p>
                    <p className="mt-0.5 font-semibold text-ink">{details.buggies}</p>
                  </div>
                )}
                {details.clubCarriage && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Clubs</p>
                    <p className="mt-0.5 font-semibold text-ink">{details.clubCarriage}</p>
                  </div>
                )}
              </div>
              {golfCourses.length > 0 && (
                <div className="mt-5 space-y-3">
                  {golfCourses.map((c, i) => (
                    <div key={i} className="rounded-xl border border-line p-4">
                      <h3 className="font-semibold text-ink">{c.heading}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{c.body}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 text-xs text-ink-soft">
                Tee times are requested and confirmed at booking — we never guarantee a tee time until the course has.
              </p>
              {((details.nonGolfer ?? []) as string[]).length > 0 && (
                <div className="mt-5">
                  <h3 className="font-semibold text-ink">For non-golfers</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {((details.nonGolfer ?? []) as string[]).map((x, i) => (
                      <span key={i} className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal-deep">{x}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Cruise detail */}
          {pkg.brand === 'cruises' && cruisePorts.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Possible ports of call</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {cruisePorts.map((p, i) => (
                  <span key={i} className="rounded-full bg-sand px-3.5 py-1.5 text-sm font-semibold text-ink">{p}</span>
                ))}
              </div>
              <p className="mt-4 text-xs text-ink-soft">
                {details.shipNote || 'Route inspiration — the cruise line, ship and exact routing always match the sailing we quote.'}
              </p>
            </section>
          )}

          {/* Where you'll stay */}
          {hotels.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Where you’ll stay</h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                Our editorial picks for this journey — your specialist confirms availability
                and can suggest alternatives to match your style and budget.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {hotels.map((h) => {
                  const href = hotelHref(h);
                  const card = (
                    <>
                      {h.image && (
                        <div className="relative aspect-[16/9]">
                          <Image src={h.image} alt={h.name} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="font-serif text-xl text-ink group-hover:text-teal-deep">{h.name}</h3>
                        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-teal-deep">
                          {[h.area, h.style].filter(Boolean).join(' · ')}
                        </p>
                        {h.description && (
                          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{h.description}</p>
                        )}
                        {href && (
                          <p className="mt-3 text-sm font-bold text-teal-deep">
                            About this hotel <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                          </p>
                        )}
                      </div>
                    </>
                  );
                  return href ? (
                    <Link key={h.id} href={href} className="card group overflow-hidden transition-shadow hover:shadow-xl hover:shadow-ink/10">
                      {card}
                    </Link>
                  ) : (
                    <div key={h.id} className="card overflow-hidden">{card}</div>
                  );
                })}
              </div>
            </section>
          )}

          {/* When to go */}
          {((destination && destination.seasonality.best.length > 0) || pkg.seasonalNotes) && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">When to go</h2>
              {destination && destination.seasonality.best.length > 0 && (
                <div className="mt-5">
                  <SeasonalityBar seasonality={destination.seasonality} />
                </div>
              )}
              {pkg.seasonalNotes && (
                <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{pkg.seasonalNotes}</p>
              )}
              {destination && destinationHref && (
                <p className="mt-3 text-sm text-ink-soft">
                  Planning around seasons, regions and style? Read the full{' '}
                  <Link href={destinationHref} className="font-semibold text-teal-deep hover:underline">
                    {destination.name} destination guide →
                  </Link>
                </p>
              )}
            </section>
          )}

          <section className="mt-12 grid gap-8 sm:grid-cols-2">
            <div className="rounded-2xl border border-teal/30 bg-teal/5 p-6">
              <h3 className="font-serif text-xl text-teal-deep">What’s included</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-ink">
                {pkg.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 font-bold text-teal">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line p-6">
              <h3 className="font-serif text-xl text-ink">Not included</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
                {pkg.excludes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {(pkg.extensions?.length ?? 0) > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Ways to extend it</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {pkg.extensions!.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-line px-4 py-3 text-sm text-ink">
                    <span className="mt-0.5 text-teal">+</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pkg.gallery.length > 1 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Gallery</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {pkg.gallery.map((src, i) => (
                  <div key={i} className={`relative overflow-hidden rounded-xl ${i === 0 ? 'col-span-2 row-span-2 aspect-square sm:aspect-[4/3]' : 'aspect-[4/3]'}`}>
                    <Image src={src} alt={`${pkg.title} — photo ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-7">
            {priceApproved ? (
              <div className="mb-5 border-b border-line pb-5">
                <p className="text-xs text-ink-soft">From</p>
                <p className="font-serif text-4xl text-ink">
                  {formatPrice(pkg.currency, pkg.priceFrom!)}
                  <span className="ml-1 font-sans text-sm text-ink-soft">per person</span>
                </p>
                <p className="mt-1 text-xs text-ink-soft">{durationLabel(pkg)} · flights quoted separately</p>
              </div>
            ) : (
              <div className="mb-5 border-b border-line pb-5">
                <p className="font-serif text-2xl text-ink">Price on request</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {durationLabel(pkg)} · every journey is priced to your dates, rooms and preferences
                </p>
              </div>
            )}
            <h3 className="font-serif text-xl text-ink">Make this trip yours</h3>
            <p className="mb-5 mt-1.5 text-sm text-ink-soft">
              Send an enquiry and a specialist will tailor dates, rooms and price to you.
            </p>
            <EnquiryForm packageId={pkg.id} packageTitle={pkg.title} compact />
          </div>
        </aside>
      </main>

      {related.length > 0 && (
        <section className="border-t border-line bg-sand py-16">
          <div className="container-site">
            <h2 className="font-serif text-3xl text-ink">You may also like</h2>
            <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PackageCard key={p.slug} pkg={p} hrefBase={hrefBase} external={externalCards} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
