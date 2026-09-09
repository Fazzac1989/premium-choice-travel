import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Icon from '@/components/staycations/coastal/Icon';
import ResultsControls, { type Facets } from '@/components/staycations/coastal/ResultsControls';
import StayCard from '@/components/staycations/coastal/StayCard';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels } from '@/lib/data';
import { PRICE_BANDS } from '@/lib/price-bands';
import { RATES_PREVIEW_COOKIE, ratesVisible, searchStayRates, type StaySearch } from '@/lib/rates';
import { EMIRATES, MEAL_PLANS, STAY_TAGS, filterHotels, sortHotels } from '@/lib/staycations/filters';
import {
  criteriaQuery,
  missingChildAges,
  parseCriteria,
  priceBasis,
} from '@/lib/staycations/search-criteria';
import { toStayCard } from '@/lib/staycations/stay-card';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Find your pause',
  description:
    'The UAE hotels our specialists actually book — search by dates, emirate and budget, and ask us to confirm the stay.',
};

export default async function StayResultsPage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const criteria = parseCriteria(searchParams);
  const all = await getStaycationHotels();
  const filtered = filterHotels(all, criteria);

  // Live totals need a date, a complete party and the price gate open. Until
  // then the list shows the specialists' guide bands and says so.
  const canSeeRates = ratesVisible(cookies().get(RATES_PREVIEW_COOKIE)?.value === '1');
  const agesMissing = missingChildAges(criteria);
  const wantsRates = canSeeRates && Boolean(criteria.checkIn) && !agesMissing && criteria.rooms === 1;

  let search: StaySearch | null = null;
  if (wantsRates) {
    // One supplier call for the whole list — never one per card.
    search = await searchStayRates({
      hotels: filtered.map((h) => ({ id: h.id, supplierCode: h.supplierCode ?? null })),
      checkIn: criteria.checkIn,
      nights: criteria.nights,
      adults: criteria.adults,
      childrenAges: criteria.childrenAges,
      rooms: criteria.rooms,
    });
  }

  const totals = new Map(Array.from(search?.rates.values() ?? []).map((r) => [r.hotelId, r.total]));
  const ordered = sortHotels(filtered, criteria, totals.size ? totals : undefined);
  const stays = ordered.map((h) => toStayCard(h, criteria, base, search ?? undefined));
  const priced = (search?.rates.size ?? 0) > 0;

  const facets: Facets = {
    emirates: EMIRATES.filter((e) => all.some((h) => h.emirate === e)),
    bands: PRICE_BANDS.filter((b) => all.some((h) => h.priceBand === b.band)).map((b) => ({ band: b.band, label: b.label })),
    meals: MEAL_PLANS.filter((m) => all.some((h) => h.mealPlans.some((x: string) => x.toLowerCase() === m.toLowerCase()))),
    stars: ['5', '4', '3'].filter((s) => all.some((h) => String(h.stars ?? '') === s)),
    tags: STAY_TAGS.filter((t) => all.some((h) => t.matches(h))).map((t) => ({ key: t.key, label: t.label })),
  };

  const notice = agesMissing
    ? { tone: 'wait' as const, text: 'Add each child’s age to see prices — hotels price children by age, so we will not guess one.' }
    : criteria.rooms > 1
      ? { tone: 'wait' as const, text: 'We confirm one room at a time online. Guide prices are shown; a specialist will price the extra rooms with you.' }
      : !canSeeRates
        ? { tone: 'quiet' as const, text: 'Guide prices shown while live rates are in testing. A specialist confirms the exact price for your dates.' }
        : !criteria.checkIn
          ? { tone: 'quiet' as const, text: 'Add your dates to see a real total for each stay.' }
          : search?.problem
            ? { tone: 'err' as const, text: 'We could not reach our hotel partner just now, so guide prices are shown. Try again in a moment.' }
            : null;

  return (
    <div className="cc-wrap py-6 lg:py-10">
      <h1 className="cc-h2 lg:text-[36px] lg:leading-[42px]">Find your pause.</h1>

      <div className="mt-4 lg:max-w-3xl">
        <ResultsControls base={base} criteria={criteria} facets={facets} count={stays.length} pricedByStay={priced} />
      </div>

      {notice && (
        <p
          className={`mt-4 flex items-start gap-2 rounded-[10px] px-4 py-3 text-[14px] leading-[20px] ${
            notice.tone === 'err'
              ? 'bg-err-bg text-err-ink'
              : notice.tone === 'wait'
                ? 'bg-wait-bg text-wait-ink'
                : 'bg-mist text-sea-soft'
          }`}
        >
          <Icon name="info" size={18} className="mt-0.5 shrink-0" />
          <span>{notice.text}</span>
        </p>
      )}

      {stays.length === 0 ? (
        <div className="mt-8 rounded-[12px] border border-sea-line p-8 text-center">
          <h2 className="cc-h4">Nothing matches that combination.</h2>
          <p className="cc-body mx-auto mt-2 max-w-md text-sea-soft">
            {criteria.emirate || criteria.tag || criteria.budget || criteria.meal || criteria.stars
              ? 'Try clearing a filter — or tell us what you have in mind and we will find it.'
              : 'Tell us what you have in mind and we will find it.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href={`${base}/hotels${criteriaQuery({ ...criteria, emirate: '', budget: '', meal: '', stars: '', tag: '' })}`}
              className="cc-btn-quiet"
            >
              Clear filters
            </Link>
            <Link href={`${base}/concierge`} className="cc-btn-primary">
              Ask a specialist
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {stays.map((stay, i) => (
              <li key={stay.slug} className="min-w-0">
                <StayCard stay={stay} basis={priceBasis(criteria)} priority={i < 3} />
              </li>
            ))}
          </ul>
          {search && search.unavailable.size > 0 && (
            <p className="cc-support mt-5">
              {search.unavailable.size} stay{search.unavailable.size === 1 ? ' has' : 's have'} no availability for these
              dates. They are still listed so you can save them or try other nights.
            </p>
          )}
          {priced && (
            <p className="cc-support mt-2">
              Totals are for {priceBasis(criteria).toLowerCase()}, from our hotel partner, and are re-checked before
              anything is confirmed. Taxes and any charge payable at the hotel are shown on each stay.
            </p>
          )}
        </>
      )}
    </div>
  );
}
