import { notFound } from 'next/navigation';
import HolidaySearchPanel from '@/components/holidays/HolidaySearchPanel';
import HolidayResultCard from '@/components/holidays/HolidayResultCard';
import { getBrand } from '@/lib/brands';
import { getDestinations } from '@/lib/data';
import { platformConfigured, PlatformError } from '@/lib/platform/client';
import { startHolidaySearch, type HolidaySearchPage } from '@/lib/holidays/holiday-search';
import {
  airportLabel,
  isSearchable,
  nightsLabel,
  parseHolidayCriteria,
  partySummary,
  tripDatesLabel,
} from '@/lib/holidays/search-criteria';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Search holidays',
  description: 'Flight and hotel together, from Dubai, Abu Dhabi, Sharjah and Ras Al Khaimah.',
};

/**
 * The results.
 *
 * The hotels are live from the platform. The flight is not yet — the platform
 * can book one but cannot search one — so a result says plainly whether its
 * price includes the flight. Nothing here invents a fare to fill the gap.
 */
export default async function HolidaySearchResults({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.key !== 'holidays') notFound();

  const criteria = parseHolidayCriteria(searchParams);
  const destinations = await getDestinations();
  const suggestions = destinations.map((d) => ({ name: d.name, region: d.region }));

  let page: HolidaySearchPage | null = null;
  let failure: string | null = null;

  if (isSearchable(criteria)) {
    if (!platformConfigured()) {
      failure = 'Live prices are not switched on in this environment.';
    } else {
      try {
        page = await startHolidaySearch(criteria);
      } catch (e) {
        failure =
          e instanceof PlatformError
            ? e.message
            : 'We could not reach our suppliers just now. Please try again in a moment.';
      }
    }
  }

  return (
    <>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-6">
          <HolidaySearchPanel suggestions={suggestions} initial={criteria} action="/search" compact />
        </div>
      </section>

      <section className="container-site py-10">
        {!isSearchable(criteria) ? (
          <Empty
            heading="Where would you like to go?"
            body="Choose your airport, where you are going and when, and we will price the hotels for your dates."
          />
        ) : failure ? (
          <Empty heading="We could not price this just now" body={failure} />
        ) : page ? (
          <Results criteria={criteria} page={page} />
        ) : null}
      </section>
    </>
  );
}

function Results({
  criteria,
  page,
}: {
  criteria: ReturnType<typeof parseHolidayCriteria>;
  page: HolidaySearchPage;
}) {
  const flightsMissing = !page.flights.available;
  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">
          {page.destinationLabel || criteria.destination}
        </h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          {nightsLabel(page.nights)} · {tripDatesLabel(criteria)} · {partySummary(criteria)} · from{' '}
          {airportLabel(criteria.origin)}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {page.total > 0
            ? `${page.total} ${page.total === 1 ? 'hotel' : 'hotels'} available`
            : 'No hotels available for these dates'}
          {page.pending ? ' · still hearing from suppliers' : ''}
        </p>
      </header>

      {flightsMissing ? (
        <div className="mb-6 rounded-xl border-l-4 border-teal-deep bg-teal/5 px-5 py-4">
          <p className="text-sm font-semibold text-ink">Prices below are for the hotel only</p>
          <p className="mt-1 text-sm text-ink-soft">
            {page.flights.note} Tell us which hotel you like and we will price the flights from{' '}
            {airportLabel(criteria.origin)} with it.
          </p>
        </div>
      ) : null}

      {page.results.length === 0 ? (
        <Empty
          heading="Nothing available for these dates"
          body="Try a different week, a nearby airport, or a shorter stay."
        />
      ) : (
        <ul className="grid gap-4">
          {page.results.map((r) => (
            <li key={r.platformHotelId}>
              <HolidayResultCard result={r} travellers={page.travellers} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Empty({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
      <h2 className="font-serif text-2xl text-ink">{heading}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{body}</p>
    </div>
  );
}
