import 'server-only';
import { platform, platformConfigured } from './client';

/**
 * Flights, as the holiday's other half.
 *
 * The trade platform does search flights — /v1/flights, asking every live
 * flight connector and merging what they say. Premium Choice flies this on
 * Travelopro rather than Duffel (founder, 2026-10-04), which is a switch on the
 * platform's own supplier connections, not anything this file chooses.
 *
 * Two things about the contract are easy to get wrong and are worth stating
 * here, because both would corrupt a holiday price:
 *
 *  - `fromPrice` on an option is the cheapest **whole trip for the whole
 *    party**, not a fare per person. It is never multiplied by head count.
 *  - the search is per leg: step one returns outbound choices, each already
 *    carrying the cheapest return that follows from it. For a "from" price on
 *    a package, step one is all we need, and the customer picks the actual
 *    flights later.
 *
 * It never invents a fare. A packaged holiday with a made-up flight price is
 * worse than no flight price, because it looks real.
 */

/**
 * Flights stay behind a switch until Travelopro is certified. The platform's
 * own note is explicit: Test access returns sandbox fares and makes test
 * bookings, so this must not be on until TRAVELOPRO_ACCESS=Live.
 */
export function flightsEnabled(): boolean {
  return platformConfigured() && process.env.PLATFORM_FLIGHTS === 'on';
}

/** minor units → dirhams */
const major = (minor: number) => Math.round(minor) / 100;

type PlatformMoney = { amount: number; currency: string };

type PlatformSlice = {
  origin: string;
  destination: string;
  duration: string | null;
  stops: number;
  segments: {
    origin: { code: string; name: string | null; city: string | null };
    destination: { code: string; name: string | null; city: string | null };
    departingAt: string;
    arrivingAt: string;
    flightNumber: string;
    carrier: string;
  }[];
};

type PlatformStep = {
  searchId: string;
  leg: number;
  legs: number;
  options: {
    optionId: string;
    airline: { code: string | null; name: string; logo: string | null };
    slice: PlatformSlice;
    fromPrice: PlatformMoney;
    prices: { refundable: PlatformMoney | null };
  }[];
};

export type FlightLeg = {
  from: string;
  to: string;
  departsAt: string;
  arrivesAt: string;
  carrier: string;
  carrierName: string;
  flightNumber: string;
  /** ISO 8601 duration as the supplier gives it, e.g. PT6H25M. */
  duration: string | null;
  stops: number;
};

export type FlightQuote = {
  searchId: string;
  optionId: string;
  airlineName: string;
  airlineLogo: string | null;
  outbound: FlightLeg;
  /** The cheapest whole trip, for everybody travelling, in dirhams. */
  tripTotal: number;
  /** The cheapest refundable whole trip, when the supplier names one. */
  refundableFrom: number | null;
  currency: string;
};

export type FlightSearchResult = {
  /** False means the platform could not answer — not that the route is sold out. */
  available: boolean;
  quote: FlightQuote | null;
  /** Why there is nothing, in words a traveller could read. */
  note: string | null;
};

const OFF: FlightSearchResult = {
  available: false,
  quote: null,
  note: 'Flights are quoted by a specialist while live flight search is being connected.',
};

export type FlightSearchInput = {
  /** Departure airport the customer chose, e.g. DXB. */
  origin: string;
  /** Where the holiday is. A code is used as given; text is looked up. */
  destination: { code: string } | { text: string };
  departDate: string;
  returnDate: string;
  adults: number;
  childAges: number[];
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
};

/**
 * Turn "Maldives" into an airport the platform can fly to.
 *
 * A holiday is searched by place and flown by airport, so this is the join
 * between the two. The platform's own catalogue answers, so it is the same list
 * the fares come from.
 */
export async function resolveAirport(text: string): Promise<string | null> {
  const q = text.trim();
  if (q.length < 2) return null;
  try {
    const res = await platform<{ places: { code: string; name: string | null; city: string | null }[] }>(
      'GET',
      `/v1/flights/places?q=${encodeURIComponent(q.slice(0, 60))}`,
      undefined,
      { timeoutMs: 8_000 },
    );
    return res.places?.[0]?.code ?? null;
  } catch {
    return null;
  }
}

function toLeg(slice: PlatformSlice, airlineName: string): FlightLeg {
  const first = slice.segments[0];
  const last = slice.segments[slice.segments.length - 1];
  return {
    from: slice.origin,
    to: slice.destination,
    departsAt: first?.departingAt ?? '',
    arrivesAt: last?.arrivingAt ?? '',
    carrier: first?.carrier ?? '',
    carrierName: airlineName,
    flightNumber: first?.flightNumber ?? '',
    duration: slice.duration,
    stops: slice.stops,
  };
}

/**
 * Ask the platform for flights, and return the cheapest whole trip.
 *
 * Returns `available: false` rather than throwing when the platform cannot
 * serve them, so a holiday search still returns its hotels and the page can say
 * plainly that the flight is quoted separately.
 */
export async function searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
  if (!flightsEnabled()) return OFF;

  const destination =
    'code' in input.destination ? input.destination.code : await resolveAirport(input.destination.text);
  if (!destination) {
    return { available: true, quote: null, note: 'We could not find an airport for that destination.' };
  }
  if (destination === input.origin) {
    return { available: true, quote: null, note: 'That destination is the airport you are flying from.' };
  }

  try {
    const step = await platform<PlatformStep>('POST', '/v1/flights/search', {
      origin: input.origin,
      destination,
      departureDate: input.departDate,
      returnDate: input.returnDate,
      adults: input.adults,
      childAges: input.childAges,
      cabinClass: input.cabinClass ?? 'economy',
      currency: 'AED',
    });

    const options = Array.isArray(step?.options) ? step.options : [];
    const best = [...options].sort((a, b) => a.fromPrice.amount - b.fromPrice.amount)[0];
    if (!best) {
      return { available: true, quote: null, note: 'No flights on these dates from this airport.' };
    }

    return {
      available: true,
      note: null,
      quote: {
        searchId: step.searchId,
        optionId: best.optionId,
        airlineName: best.airline.name,
        airlineLogo: best.airline.logo,
        outbound: toLeg(best.slice, best.airline.name),
        tripTotal: major(best.fromPrice.amount),
        refundableFrom: best.prices?.refundable ? major(best.prices.refundable.amount) : null,
        currency: best.fromPrice.currency,
      },
    };
  } catch {
    // A flight search that falls over must not take the hotels down with it.
    return OFF;
  }
}
