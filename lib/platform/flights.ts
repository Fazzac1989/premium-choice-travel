import 'server-only';
import { platform, platformConfigured, type Money } from './client';

/**
 * Flights, as the holiday's other half.
 *
 * The trade platform can already book a flight — it has the product type and the
 * connectors behind it — but it does not yet answer a flight *search*, and there
 * is no endpoint that prices a flight and a hotel as one holiday. Until it does,
 * this module is the seam: the site asks it for flights in the shape it will
 * always ask, and gets an honest "not yet" back.
 *
 * It never invents a fare. A packaged holiday with a made-up flight price is
 * worse than no flight price, because it looks real.
 */

/** Flights are served only when the platform is wired up and the switch is on. */
export function flightsEnabled(): boolean {
  return platformConfigured() && process.env.PLATFORM_FLIGHTS === 'on';
}

export type FlightLeg = {
  /** IATA, e.g. DXB */
  from: string;
  to: string;
  /** ISO 8601 local departure and arrival, as the carrier publishes them. */
  departsAt: string;
  arrivesAt: string;
  carrier: string;
  carrierName: string;
  flightNumber: string;
  /** Minutes in the air plus any time on the ground between segments. */
  durationMinutes: number;
  stops: number;
};

export type FlightOffer = {
  offerId: string;
  outbound: FlightLeg;
  inbound: FlightLeg | null;
  cabin: 'economy' | 'premium_economy' | 'business';
  /** Per person, all taxes in. The platform never sends a net fare to a brand. */
  price: Money;
  baggage: { cabin: string | null; checked: string | null };
  refundable: boolean;
  /** Seats the carrier is still holding at this price, when it tells us. */
  seatsLeft: number | null;
};

export type FlightSearchInput = {
  /** Departure airport the customer chose, e.g. DXB. */
  origin: string;
  /** Where the holiday is: a city code when we have one, otherwise free text. */
  destination: { cityCode: string } | { text: string };
  /** ISO dates. The return leg is the day the customer flies home. */
  departDate: string;
  returnDate: string;
  adults: number;
  childAges: number[];
  cabin?: FlightOffer['cabin'];
};

export type FlightSearchResult = {
  /** False means the platform cannot answer yet — not that the route is sold out. */
  available: boolean;
  offers: FlightOffer[];
  /** Why there is nothing, in words a traveller could read. */
  note: string | null;
};

const UNAVAILABLE: FlightSearchResult = {
  available: false,
  offers: [],
  note: 'Flights are quoted by a specialist while live flight search is being connected.',
};

/**
 * Ask the platform for flights.
 *
 * Returns `available: false` rather than throwing when the platform cannot serve
 * them, so a holiday search still returns its hotels and the page can say plainly
 * that the flight is quoted separately.
 */
export async function searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
  if (!flightsEnabled()) return UNAVAILABLE;
  try {
    const res = await platform<{ offers: FlightOffer[] }>('POST', '/v1/search/flights', {
      origin: input.origin,
      destination: input.destination,
      departDate: input.departDate,
      returnDate: input.returnDate,
      passengers: {
        adults: input.adults,
        childAges: input.childAges,
      },
      cabin: input.cabin ?? 'economy',
      currency: 'AED',
    });
    const offers = Array.isArray(res?.offers) ? res.offers : [];
    return offers.length
      ? { available: true, offers, note: null }
      : { available: true, offers: [], note: 'No flights on these dates from this airport.' };
  } catch {
    // A flight search that falls over must not take the hotels down with it.
    return UNAVAILABLE;
  }
}

/** The cheapest offer, which is what a "from" price on a holiday is built on. */
export function cheapestFlight(offers: FlightOffer[]): FlightOffer | null {
  return offers.length ? [...offers].sort((a, b) => a.price.amount - b.price.amount)[0] : null;
}
