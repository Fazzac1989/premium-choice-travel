import Link from 'next/link';
import type { Package, Seasonality } from '@/lib/types';
import GolfCard from '@/components/golf/GolfCard';
import GolfFilters from '@/components/golf/GolfFilters';
import {
  GOLF_BOARDS,
  GOLF_LENGTHS,
  GOLF_ROUNDS,
  GOLF_TRIP_TYPES,
  activeFilterCount,
  approvedPrice,
  filterGolf,
  golfGeography,
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
  const results = filterGolf(packages, criteria, seasonality);
  const active = activeFilterCount(criteria);
  const anyPriced = packages.some((p) => approvedPrice(p) !== null);

  const countryName = geography.flatMap((g) => g.countries).find((c) => c.slug === criteria.country)?.country;
  const chips: { label: string; drop: keyof GolfCriteria | 'where' }[] = [];
  if (criteria.q) chips.push({ label: `“${criteria.q}”`, drop: 'q' });
  if (countryName || criteria.region) chips.push({ label: countryName ?? criteria.region, drop: 'where' });
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

  const heading =
    criteria.length === 'short' && active === 1
      ? 'Golf breaks'
      : countryName || criteria.region
        ? `Golf holidays in ${countryName ?? criteria.region}`
        : type && active === 1
          ? type.label
          : criteria.group && active === 1
            ? 'Golf for groups and societies'
            : 'Golf holidays';

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-10 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
            <Link href={`${base}/`} className="hover:text-teal-deep">Home</Link>
            <span aria-hidden> / </span>
            <Link href={path} className="hover:text-teal-deep">Golf holidays</Link>
            {criteria.region && !countryName && (<><span aria-hidden> / </span><span>{criteria.region}</span></>)}
            {countryName && (<><span aria-hidden> / </span><span>{countryName}</span></>)}
          </nav>
          <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">{heading}</h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Every trip shows where you stay, how many nights and rounds, the board basis and how the flights work.
            Prices are in AED per person and appear once we have costed them with the hotel and the clubs.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-12">
        <div className="container-site grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <details className="group rounded-2xl border border-line bg-white p-5 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-ink">
                Filter trips{active > 0 ? ` (${active})` : ''}
                <span aria-hidden className="text-ink-soft transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="mt-5">
                <GolfFilters idPrefix="gfm" action={path} criteria={criteria} geography={geography} showBudget={anyPriced} />
              </div>
            </details>
            <div className="hidden rounded-2xl border border-line bg-white p-5 lg:block">
              <GolfFilters idPrefix="gfd" action={path} criteria={criteria} geography={geography} showBudget={anyPriced} />
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center gap-2" aria-live="polite">
              <p className="mr-2 text-sm font-semibold text-ink">
                {results.length} {results.length === 1 ? 'trip' : 'trips'}
                {active > 0 && <span className="font-normal text-ink-soft"> of {packages.length}</span>}
              </p>
              {chips.map((c) => (
                <Link
                  key={c.label}
                  href={hrefWithout(path, criteria, c.drop)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-ink hover:border-teal-deep"
                  aria-label={`Remove filter: ${c.label}`}
                >
                  {c.label} <span aria-hidden className="text-ink-soft">×</span>
                </Link>
              ))}
              {active > 0 && (
                <Link href={path} className="text-xs font-semibold text-teal-deep underline-offset-2 hover:underline">
                  Clear all
                </Link>
              )}
            </div>

            {results.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-line p-10 text-center">
                <p className="font-serif text-2xl text-ink">Nothing matches all of that yet.</p>
                <p className="mx-auto mt-3 max-w-md text-ink-soft">
                  Remove a filter, or tell us the trip you have in mind and a golf specialist will put it together.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href={path} className="btn-outline">Clear all filters</Link>
                  <Link href={`${base}/enquire`} className="btn-primary">Ask a golf specialist</Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((pkg, i) => (
                  <GolfCard key={pkg.slug} pkg={pkg} href={`${path}/${pkg.slug}`} priority={i < 3} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
