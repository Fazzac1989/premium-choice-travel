import Image from 'next/image';
import Link from 'next/link';
import type { Package, Seasonality } from '@/lib/types';
import GolfCard from '@/components/golf/GolfCard';
import GolfFilters from '@/components/golf/GolfFilters';
import GolfSort from '@/components/golf/GolfSort';
import {
  GOLF_BOARDS,
  GOLF_LENGTHS,
  GOLF_ROUNDS,
  GOLF_TRIP_TYPES,
  activeFilterCount,
  approvedPrice,
  filterGolf,
  golfGeography,
  sortGolf,
  type GolfCriteria,
} from '@/lib/golf/catalogue';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The criteria as a query string, minus one key — what each "remove" chip links to. */
function hrefWithout(path: string, c: GolfCriteria, drop: keyof GolfCriteria | 'where') {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(c)) {
    if (k === drop || (drop === 'where' && (k === 'region' || k === 'country'))) continue;
    if (k === 'group') {
      if (v) q.set('group', '1');
    } else if (v) q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/**
 * Golf search results, laid out like a golf operator's: a destination
 * banner when browsing a place, filters down the left, a toolbar with the
 * count, the active filters and the order, then one wide card per trip.
 */
export default function GolfCatalogue({
  base,
  packages,
  criteria,
  seasonality,
}: {
  base: string;
  packages: Package[];
  criteria: GolfCriteria;
  seasonality: Record<string, Seasonality | undefined>;
}) {
  const path = `${base}/journeys`;
  const geography = golfGeography(packages);
  const results = sortGolf(filterGolf(packages, criteria, seasonality), criteria.sort);
  const active = activeFilterCount(criteria);
  const anyPriced = packages.some((p) => approvedPrice(p) !== null);

  const country = geography.flatMap((g) => g.countries).find((c) => c.slug === criteria.country);
  const regionOfCountry = country ? geography.find((g) => g.countries.some((c) => c.slug === country.slug))?.region : null;
  const place = country?.country ?? (criteria.region || null);

  const chips: { label: string; drop: keyof GolfCriteria | 'where' }[] = [];
  if (criteria.q) chips.push({ label: `“${criteria.q}”`, drop: 'q' });
  if (place) chips.push({ label: place, drop: 'where' });
  const type = GOLF_TRIP_TYPES.find((t) => t.key === criteria.type);
  if (type) chips.push({ label: type.label, drop: 'type' });
  const length = GOLF_LENGTHS.find((l) => l.key === criteria.length);
  if (length) chips.push({ label: length.label, drop: 'length' });
  const rounds = GOLF_ROUNDS.find((r) => r.key === criteria.rounds);
  if (rounds) chips.push({ label: rounds.label, drop: 'rounds' });
  const board = GOLF_BOARDS.find((b) => b.key === criteria.board);
  if (board) chips.push({ label: board.label, drop: 'board' });
  const month = Number(criteria.month);
  if (month >= 1 && month <= 12) chips.push({ label: `Good in ${MONTHS[month - 1]}`, drop: 'month' });
  if (Number(criteria.budget) > 0) chips.push({ label: `Up to AED ${Number(criteria.budget).toLocaleString('en-GB')}`, drop: 'budget' });
  if (criteria.group) chips.push({ label: 'Groups and societies', drop: 'group' });

  const heading = place
    ? `${place} golf holidays`
    : criteria.length === 'short' && active === 1
      ? 'Golf breaks'
      : type && active === 1
        ? `${type.label} holidays`
        : month >= 1 && active === 1
          ? `Golf holidays in ${MONTHS[month - 1]}`
          : criteria.group && active === 1
            ? 'Golf for groups and societies'
            : 'Golf holidays';
  const sub = place
    ? `${results.length} ${results.length === 1 ? 'trip' : 'trips'} with named courses, nights and rounds.`
    : 'Every trip shows where you stay, the courses, nights, rounds, board and how the flights work.';

  // A place gets a photo banner, from one of its own trips.
  const bannerImage = place ? results.find((p) => p.heroImage)?.heroImage ?? null : null;

  const crumbs = (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
      <Link href={`${base}/`} className="hover:underline">Home</Link>
      <Chevron />
      <Link href={path} className="hover:underline">Golf holidays</Link>
      {regionOfCountry && (<><Chevron /><Link href={`${path}?region=${encodeURIComponent(regionOfCountry)}`} className="hover:underline">{regionOfCountry}</Link></>)}
      {place && (<><Chevron /><span aria-current="page">{place}</span></>)}
    </nav>
  );

  return (
    <main className="bg-golf-mist/60">
      {bannerImage ? (
        <section className="relative">
          <Image src={bannerImage} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-golf-navy/85 via-golf-navy/55 to-golf-navy/10" />
          <div className="container-site relative py-12 text-white sm:py-16">
            <div className="text-white/85">{crumbs}</div>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.015em] sm:text-5xl">{heading}</h1>
            <p className="mt-2 max-w-xl text-white/85">{sub}</p>
          </div>
        </section>
      ) : (
        <section className="border-b border-golf-line bg-white">
          <div className="container-site py-7">
            <div className="text-fairway">{crumbs}</div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.015em] text-golf-navy sm:text-4xl">{heading}</h1>
            <p className="mt-1.5 max-w-2xl text-ink-soft">{sub}</p>
          </div>
        </section>
      )}

      <section className="py-8">
        <div className="container-site grid gap-8 lg:grid-cols-[270px_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <details className="group card p-5 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between font-extrabold text-golf-navy">
                Filter trips{active > 0 ? ` (${active})` : ''}
                <span aria-hidden className="text-ink-soft transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="mt-5">
                <GolfFilters idPrefix="gfm" action={path} criteria={criteria} geography={geography} showBudget={anyPriced} />
              </div>
            </details>
            <div className="card hidden p-5 lg:block">
              <p className="mb-4 font-extrabold text-golf-navy">Filter trips</p>
              <GolfFilters idPrefix="gfd" action={path} criteria={criteria} geography={geography} showBudget={anyPriced} />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-golf-navy" aria-live="polite">
                <span className="text-lg font-extrabold">{results.length}</span> golf {results.length === 1 ? 'holiday' : 'holidays'}
                {active > 0 && <span className="text-ink-soft"> of {packages.length}</span>}
              </p>
              <GolfSort action={path} criteria={criteria} showPrice={anyPriced} />
            </div>
            {chips.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {chips.map((c) => (
                  <Link
                    key={c.label}
                    href={hrefWithout(path, criteria, c.drop)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-golf-line bg-white px-3 py-1 text-xs font-bold text-golf-navy hover:border-fairway"
                    aria-label={`Remove filter: ${c.label}`}
                  >
                    {c.label} <span aria-hidden className="text-ink-soft">×</span>
                  </Link>
                ))}
                <Link href={path} className="text-xs font-bold text-fairway hover:underline">Clear all</Link>
              </div>
            )}

            {results.length === 0 ? (
              <div className="card mt-6 p-10 text-center">
                <p className="text-2xl font-extrabold text-golf-navy">Nothing matches all of that yet.</p>
                <p className="mx-auto mt-2 max-w-md text-ink-soft">
                  Remove a filter, or tell us the trip you have in mind and a golf specialist will put it together.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href={path} className="btn-outline">Clear all filters</Link>
                  <Link href={`${base}/enquire`} className="btn-primary">Ask a golf specialist</Link>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {results.map((pkg, i) => (
                  <GolfCard key={pkg.slug} pkg={pkg} href={`${path}/${pkg.slug}`} priority={i < 2} layout="row" />
                ))}
              </div>
            )}

            {results.length > 0 && (
              <div className="card mt-8 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <div>
                  <p className="font-extrabold text-golf-navy">Can’t see quite the right trip?</p>
                  <p className="text-sm text-ink-soft">Every trip here reshapes around your dates, courses and party.</p>
                </div>
                <Link href={`${base}/enquire`} className="btn-primary shrink-0">Ask a golf specialist</Link>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Chevron() {
  return (
    <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" className="opacity-70">
      <path d="m3 1 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

