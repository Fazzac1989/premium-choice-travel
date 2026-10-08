import Image from 'next/image';
import Link from 'next/link';
import type { Destination, Hotel, Package } from '@/lib/types';
import { durationLabel, formatPrice } from '@/lib/types';
import EnquiryForm from '@/components/EnquiryForm';
import SeasonalityBar from '@/components/SeasonalityBar';
import WhatsAppLink from '@/components/WhatsAppLink';
import GolfCard from '@/components/golf/GolfCard';
import { TEE_TIME_STATUS, approvedPrice, golfFacts, stripAccessNote } from '@/lib/golf/catalogue';

/**
 * A golf trip page in the shape golf operators use for a resort: a photo
 * mosaic, a dark bar of sections, breadcrumbs, the kind of trip, the name
 * and where it is — then the detail in a column with the booking box
 * alongside. Built only from the trip's own record.
 */
export default function GolfTrip({
  pkg,
  base,
  related,
  hotels,
  destination,
}: {
  pkg: Package;
  base: string;
  related: Package[];
  hotels: Hotel[];
  destination: Destination | null;
}) {
  const journeys = `${base}/journeys`;
  const f = golfFacts(pkg);
  const d = (pkg.details ?? {}) as Record<string, any>;
  const price = approvedPrice(pkg);
  const tee = TEE_TIME_STATUS[String(d.teeTimeStatus ?? 'unknown')] ?? TEE_TIME_STATUS.unknown;
  const courses = (Array.isArray(d.courses) ? d.courses : []) as { heading: string; body: string }[];
  const nonGolfer = (Array.isArray(d.nonGolfer) ? d.nonGolfer : []) as string[];
  const photos = Array.from(new Set([pkg.heroImage, ...(pkg.gallery ?? [])].filter(Boolean))).slice(0, 5);
  const known = (v: unknown) => typeof v === 'string' && v.trim() !== '' && !/^unknown$/i.test(v.trim());

  const sections: [string, string][] = [
    ['overview', 'Overview'],
    ...(courses.length > 0 || d.rounds ? [['golf', 'The golf'] as [string, string]] : []),
    ...(pkg.itinerary.length > 0 ? [['itinerary', 'Itinerary'] as [string, string]] : []),
    ['included', 'What’s included'],
    ...(destination?.seasonality.best.length || pkg.seasonalNotes ? [['when', 'When to go'] as [string, string]] : []),
    ['enquire', 'Enquire'],
  ];
  const pills = [
    durationLabel(pkg),
    f.roundsLabel,
    f.board,
    f.flights === 'Not needed' ? 'No flight needed' : `Flights ${f.flights.toLowerCase()}`,
  ].filter(Boolean) as string[];

  return (
    <main className="bg-white">
      {/* Photo mosaic */}
      <section className="bg-golf-navy">
        {photos.length >= 3 ? (
          <div className="grid h-[260px] gap-1 sm:h-[340px] lg:h-[420px] lg:grid-cols-[2fr_1fr_1fr] lg:grid-rows-2">
            <Photo src={photos[0]} alt={pkg.title} priority className="lg:row-span-2" sizes="(max-width: 1024px) 100vw, 50vw" />
            {photos.slice(1, 5).map((src, i) => (
              <Photo key={src} src={src} alt={`${pkg.title} — photo ${i + 2}`} className="hidden lg:block" sizes="25vw" />
            ))}
          </div>
        ) : (
          <div className="relative h-[260px] sm:h-[360px]">
            {photos[0] ? <Photo src={photos[0]} alt={pkg.title} priority className="absolute inset-0" sizes="100vw" />
              : <div className="absolute inset-0 bg-gradient-to-br from-fairway to-golf-navy" />}
          </div>
        )}
      </section>

      {/* Section bar */}
      <nav aria-label="On this page" className="sticky top-0 z-30 bg-golf-navy">
        <div className="container-site flex gap-1 overflow-x-auto">
          {sections.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 px-4 py-3.5 text-[13px] font-extrabold uppercase tracking-wide text-white/85 hover:bg-white/10 hover:text-white">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="container-site pt-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-fairway">
          <Link href={`${base}/`} className="hover:underline">Home</Link>
          <span aria-hidden>›</span>
          <Link href={journeys} className="hover:underline">Golf holidays</Link>
          <span aria-hidden>›</span>
          <Link href={`${journeys}?region=${encodeURIComponent(f.region)}`} className="hover:underline">{f.region}</Link>
          <span aria-hidden>›</span>
          <Link href={`${journeys}?country=${f.countrySlug}`} className="hover:underline">{f.country}</Link>
          <span aria-hidden>›</span>
          <span className="text-ink-soft" aria-current="page">{pkg.title}</span>
        </nav>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Link href={`${journeys}?type=${f.tripType}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-fairway-wash px-2.5 py-1 text-xs font-extrabold text-fairway hover:underline">
              <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 21V3l11 4-11 4" /></svg>
              {f.tripTypeLabel}
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.015em] text-golf-navy sm:text-4xl">{pkg.title}</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-ink-soft">
              <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
              {f.country}, {f.region}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {pills.map((p) => (
              <span key={p} className="rounded-full border border-golf-line bg-golf-mist px-3 py-1 text-xs font-bold text-golf-navy">{p}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="container-site grid gap-10 pb-16 pt-8 lg:grid-cols-[1fr_370px] lg:gap-12">
        <div className="min-w-0 space-y-12">
          <section id="overview" className="scroll-mt-16">
            <h2 className="text-2xl font-extrabold text-golf-navy">Overview</h2>
            <p className="mt-2 text-lg text-golf-navy">{pkg.tagline}</p>
            <div className="mt-4 space-y-4 leading-relaxed text-ink-soft">
              {pkg.overview.map((p, i) => <p key={i}>{stripAccessNote(p)}</p>)}
            </div>
            {pkg.highlights.length > 0 && (
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {pkg.highlights.map((h) => <Tick key={h}>{h}</Tick>)}
              </ul>
            )}
            {((pkg.whoFor?.length ?? 0) > 0 || (pkg.whyWorks?.length ?? 0) > 0) && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(pkg.whoFor?.length ?? 0) > 0 && (
                  <Box title="Who it suits">{pkg.whoFor!.map((w) => <li key={w}>{w}</li>)}</Box>
                )}
                {(pkg.whyWorks?.length ?? 0) > 0 && (
                  <Box title="Why it works">{pkg.whyWorks!.map((w) => <li key={w}>{w}</li>)}</Box>
                )}
              </div>
            )}
          </section>

          {(courses.length > 0 || d.rounds) && (
            <section id="golf" className="scroll-mt-16">
              <h2 className="text-2xl font-extrabold text-golf-navy">The golf</h2>
              <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ['Rounds', f.roundsLabel],
                  ['Tee times', tee.label],
                  ['Buggies', known(d.buggies) ? d.buggies : null],
                  ['Caddies', known(d.caddies) ? d.caddies : null],
                  ['Handicap', known(d.handicap) ? d.handicap : null],
                  ['Clubs', known(d.clubCarriage) ? d.clubCarriage : null],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="rounded-xl border border-golf-line p-4">
                    <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">{k}</dt>
                    <dd className="mt-1 text-sm font-semibold text-golf-navy">{v as string}</dd>
                  </div>
                ))}
              </dl>
              {courses.length > 0 && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {courses.map((c, i) => (
                    <div key={c.heading + i} className="card p-5">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-fairway">Course {i + 1}</p>
                      <h3 className="mt-1 text-lg font-extrabold text-golf-navy">{c.heading}</h3>
                      {stripAccessNote(c.body) && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{stripAccessNote(c.body)}</p>}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-4 rounded-lg bg-fairway-wash px-4 py-3 text-sm text-golf-navy">{tee.detail}</p>
              {nonGolfer.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-extrabold text-golf-navy">For non-golfers</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {nonGolfer.map((x) => <span key={x} className="rounded-full bg-golf-mist px-3 py-1.5 text-sm font-semibold text-golf-navy">{x}</span>)}
                  </div>
                </div>
              )}
            </section>
          )}

          {pkg.itinerary.length > 0 && (
            <section id="itinerary" className="scroll-mt-16">
              <h2 className="text-2xl font-extrabold text-golf-navy">Itinerary</h2>
              <ol className="mt-5 space-y-3">
                {pkg.itinerary.map((day, i) => (
                  <li key={i} className="card flex gap-4 p-4">
                    <span className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-golf-navy text-center text-[11px] font-extrabold uppercase leading-tight text-white">
                      {day.label}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-golf-navy">{day.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{stripAccessNote(day.description)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section id="included" className="scroll-mt-16">
            <h2 className="text-2xl font-extrabold text-golf-navy">What’s included</h2>
            {(f.stay || hotels.length > 0) && (
              <div className="mt-4 rounded-xl border border-golf-line p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-soft">Where you stay</p>
                <p className="mt-1 font-semibold text-golf-navy">{hotels.length > 0 ? hotels.map((h) => h.name).join(' · ') : f.stay}</p>
                {f.board && <p className="text-sm text-ink-soft">{f.board}</p>}
              </div>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-fairway-wash p-5">
                <h3 className="font-extrabold text-golf-navy">Included</h3>
                <ul className="mt-3 space-y-2">{pkg.includes.map((i) => <Tick key={i}>{i}</Tick>)}</ul>
              </div>
              <div className="rounded-xl border border-golf-line p-5">
                <h3 className="font-extrabold text-golf-navy">Not included</h3>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  {pkg.excludes.map((x) => <li key={x} className="flex gap-2"><span aria-hidden>–</span>{x}</li>)}
                </ul>
              </div>
            </div>
            {(pkg.extensions?.length ?? 0) > 0 && (
              <div className="mt-4">
                <h3 className="font-extrabold text-golf-navy">Add to your trip</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {pkg.extensions!.map((x) => (
                    <li key={x} className="rounded-lg border border-golf-line px-4 py-2.5 text-sm text-golf-navy">+ {x}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {(destination?.seasonality.best.length || pkg.seasonalNotes) && (
            <section id="when" className="scroll-mt-16">
              <h2 className="text-2xl font-extrabold text-golf-navy">When to go</h2>
              {destination && destination.seasonality.best.length > 0 && (
                <div className="mt-4"><SeasonalityBar seasonality={destination.seasonality} /></div>
              )}
              {pkg.seasonalNotes && <p className="mt-4 leading-relaxed text-ink-soft">{pkg.seasonalNotes}</p>}
            </section>
          )}
        </div>

        {/* Booking box */}
        <aside id="enquire" className="scroll-mt-16 lg:sticky lg:top-16 lg:self-start">
          <div className="card overflow-hidden">
            <div className="bg-golf-navy p-5 text-white">
              {price !== null ? (
                <>
                  <p className="text-xs text-white/70">from</p>
                  <p className="text-4xl font-extrabold leading-none">
                    {formatPrice(pkg.currency, price)}<span className="ml-1 text-base font-bold">pp</span>
                  </p>
                </>
              ) : (
                <p className="text-2xl font-extrabold">Price on request</p>
              )}
              <p className="mt-1.5 text-xs text-white/75">
                {durationLabel(pkg)} · costed for your dates and rooms · flights {f.flights.toLowerCase()}
              </p>
            </div>
            <ul className="space-y-1.5 border-b border-golf-line p-5 text-sm text-golf-navy">
              <li><span className="text-ink-soft">Stay:</span> {f.stay ?? 'Hotel chosen with you'}</li>
              <li><span className="text-ink-soft">Board:</span> {f.board ?? 'To be agreed'}</li>
              <li><span className="text-ink-soft">Golf:</span> {f.roundsLabel ?? 'To be agreed'}</li>
              <li><span className="text-ink-soft">Tee times:</span> {tee.label}</li>
            </ul>
            <div className="p-5">
              <p className="font-extrabold text-golf-navy">Make this trip yours</p>
              <p className="mb-4 mt-1 text-sm text-ink-soft">Send your dates and party — a golf specialist costs it for you.</p>
              <EnquiryForm brand="golf" packageId={pkg.id} packageTitle={pkg.title} compact />
              <WhatsAppLink className="mt-3" text={`Hello, I'm interested in ${pkg.title} (${pkg.nights} nights). My dates are: `} />
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t border-golf-line bg-golf-mist py-12">
          <div className="container-site">
            <h2 className="text-2xl font-extrabold text-golf-navy">You may also like</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => <GolfCard key={p.slug} pkg={p} href={`${journeys}/${p.slug}`} />)}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function Photo({ src, alt, className = '', priority = false, sizes }: { src: string; alt: string; className?: string; priority?: boolean; sizes: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
    </div>
  );
}

function Tick({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-golf-navy">
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" className="mt-0.5 shrink-0 text-fairway" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5 9-10" /></svg>
      <span>{children}</span>
    </li>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-golf-line p-5">
      <h3 className="font-extrabold text-golf-navy">{title}</h3>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">{children}</ul>
    </div>
  );
}
