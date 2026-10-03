import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import HolidayRooms from '@/components/holidays/HolidayRooms';
import { getBrand } from '@/lib/brands';
import { platformConfigured, PlatformError } from '@/lib/platform/client';
import { holidayHotel, type HolidayHotel } from '@/lib/holidays/holiday-search';
import {
  airportLabel,
  holidayQuery,
  isSearchable,
  nightsLabel,
  parseHolidayCriteria,
  partySummary,
  tripDatesLabel,
} from '@/lib/holidays/search-criteria';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your holiday',
  description: 'Choose your room and we will price the flights alongside it.',
};

const isPlatformId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/**
 * One hotel from the search, priced for these dates.
 *
 * The price is fetched fresh rather than carried from the results page: a
 * customer can arrive here from a link long after that search session expired,
 * and this is the number they are about to act on.
 */
export default async function HolidayHotelPage({
  params,
  searchParams,
}: {
  params: { brand: string; hotelId: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.key !== 'holidays') notFound();
  if (!isPlatformId(params.hotelId)) notFound();

  const criteria = parseHolidayCriteria(searchParams);
  const backHref = `/search?${holidayQuery(criteria)}`;

  let hotel: HolidayHotel | null = null;
  let failure: string | null = null;

  if (!isSearchable(criteria)) {
    failure = 'We need your dates to price this hotel.';
  } else if (!platformConfigured()) {
    failure = 'Live prices are not switched on in this environment.';
  } else {
    try {
      hotel = await holidayHotel(params.hotelId, criteria);
      if (!hotel) failure = 'This hotel has no rooms left for your dates.';
    } catch (e) {
      failure =
        e instanceof PlatformError
          ? e.message
          : 'We could not reach our suppliers just now. Please try again in a moment.';
    }
  }

  const tripLabel = `${nightsLabel(criteria.nights)} · ${tripDatesLabel(criteria)} · ${partySummary(
    criteria,
  )} · from ${airportLabel(criteria.origin)}`;

  return (
    <article className="container-site py-8">
      <Link
        href={backHref}
        className="text-sm font-semibold text-ink-soft underline-offset-4 hover:text-teal-deep hover:underline"
      >
        &larr; Back to results
      </Link>

      {failure || !hotel ? (
        <div className="mt-6 rounded-2xl border border-line bg-white px-6 py-14 text-center">
          <h1 className="font-serif text-2xl text-ink">We could not price this</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{failure}</p>
          <Link
            href={backHref}
            className="mt-5 inline-block rounded-lg bg-teal-deep px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-hover"
          >
            Back to results
          </Link>
        </div>
      ) : (
        <>
          <header className="mt-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-serif text-3xl text-ink sm:text-4xl">{hotel.name}</h1>
              {hotel.stars ? (
                <span className="text-teal-deep" aria-label={`${hotel.stars} star`}>
                  {'★'.repeat(hotel.stars)}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-sm text-ink-soft">{hotel.city}</p>
            <p className="mt-1 text-sm text-ink-soft">{tripLabel}</p>
          </header>

          {hotel.image ? (
            <div className="relative mt-6 aspect-[21/9] overflow-hidden rounded-2xl bg-sand">
              <Image
                src={hotel.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-cover"
                priority
              />
            </div>
          ) : null}

          {!hotel.flights.available ? (
            <div className="mt-6 rounded-xl border-l-4 border-teal-deep bg-teal/5 px-5 py-4">
              <p className="text-sm font-semibold text-ink">Prices here are for the hotel only</p>
              <p className="mt-1 text-sm text-ink-soft">
                {hotel.flights.note} Pick your room below and we will price the flights from{' '}
                {airportLabel(criteria.origin)} with it.
              </p>
            </div>
          ) : null}

          {hotel.description ? (
            <section className="mt-8 max-w-prose">
              <h2 className="font-serif text-2xl text-ink">About this hotel</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{hotel.description}</p>
            </section>
          ) : null}

          <div className="mt-8">
            <HolidayRooms
              rooms={hotel.rooms}
              travellers={hotel.travellers}
              nights={hotel.nights}
              hotelName={hotel.name}
              tripLabel={tripLabel}
              flightPending={!hotel.flights.available}
              brand={brand.key}
            />
          </div>
        </>
      )}
    </article>
  );
}
