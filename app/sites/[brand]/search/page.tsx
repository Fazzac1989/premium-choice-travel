import { notFound } from 'next/navigation';
import HolidaySearchPanel from '@/components/holidays/HolidaySearchPanel';
import HolidayResults from '@/components/holidays/HolidayResults';
import { getBrand } from '@/lib/brands';
import { getDestinations } from '@/lib/data';
import { platformConfigured, PlatformError } from '@/lib/platform/client';
import { startHolidaySearch, type HolidaySearchPage } from '@/lib/holidays/holiday-search';
import { isSearchable, parseHolidayCriteria } from '@/lib/holidays/search-criteria';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Search holidays',
  description: 'Flight and hotel together, from Dubai, Abu Dhabi, Sharjah and Ras Al Khaimah.',
};

/**
 * The results.
 *
 * The first page is rendered on the server so there is something to read
 * immediately, then the browser keeps asking until the platform says every
 * supplier has answered — a search is reported as empty only once it is
 * actually finished.
 *
 * The hotels are live. The flight is not yet: the platform can book one but
 * cannot search one, so a result says plainly whether its price includes the
 * flight. Nothing here invents a fare to fill the gap.
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

  // Flattened for the poll action, which re-parses them rather than trusting them.
  const flatParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(searchParams)) {
    const one = Array.isArray(v) ? v[0] : v;
    if (one !== undefined) flatParams[k] = one;
  }

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
          <HolidayResults initial={page} criteria={criteria} params={flatParams} />
        ) : null}
      </section>
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
