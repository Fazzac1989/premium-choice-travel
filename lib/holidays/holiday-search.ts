import 'server-only';
import {
  boardName,
  startSearch,
  readSearch,
  searchHotels,
  type PlatformCard,
  type PlatformOffer,
  type PlatformSearch,
  type SearchFilters,
} from '@/lib/platform/client';
import { searchFlights, type FlightQuote, type FlightSearchResult } from '@/lib/platform/flights';
import { sharper } from '@/lib/platform/content';
// Suppliers shout room names in capitals; the same tidier both brands use.
import { roomTitle } from '@/lib/staycations/stay-search';
import {
  returnDateOf,
  type HolidayCriteria,
} from './search-criteria';

/**
 * A holiday is a flight and a hotel with one price on it.
 *
 * The platform answers for hotels today and not yet for flights, so this returns
 * the hotels either way and says, per result, whether the flight is in the price.
 * A result whose flight is missing is still a real, bookable hotel — it is just
 * not yet a package, and the page must say so rather than imply a total that
 * nobody has quoted.
 */

/** minor units → dirhams */
const major = (minor: number) => Math.round(minor) / 100;

/** Only a room that confirms on payment is offered. "On request" is not a holiday. */
const bookable = (o: PlatformOffer) => o.availabilityMode !== 'on_request';

export type HolidayRoom = {
  offerId: string;
  roomName: string;
  board: string;
  refundable: boolean;
  refundDeadline: string | null;
  /** The whole stay for the whole party, in dirhams. */
  total: number;
  perNight: number;
  currency: string;
};

export type HolidayResult = {
  platformHotelId: string;
  name: string;
  city: string;
  countryCode: string;
  stars: number | null;
  image: string | null;
  nights: number;
  room: HolidayRoom;
  /** The cheapest flight that fits these dates, when the platform can price one. */
  flight: FlightQuote | null;
  /** Hotel plus flights for everyone travelling, in dirhams. Null when no flight. */
  packageTotal: number | null;
  /** What the holiday costs each traveller. Hotel-only when there is no flight. */
  perPerson: number;
  /** True when the price above is the hotel alone and the flight is still to come. */
  flightPending: boolean;
};

export type HolidaySearchPage = {
  sessionId: string;
  pending: boolean;
  destinationLabel: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  total: number;
  nextOffset: number | null;
  results: HolidayResult[];
  flights: FlightSearchResult;
  /** Everyone who needs a seat and a bed. */
  travellers: number;
};

export const travellersIn = (c: HolidayCriteria) => c.adults + c.childrenAges.length;

function toRoom(o: PlatformOffer): HolidayRoom {
  return {
    offerId: o.offerId,
    roomName: roomTitle(o.roomName),
    board: boardName(o.board),
    refundable: o.refundable,
    refundDeadline: o.refundDeadline,
    total: major(o.price.total.amount),
    perNight: major(o.price.perNight.amount),
    currency: o.price.total.currency,
  };
}

/**
 * Every offer on a card.
 *
 * A supplier may send a card with no alternatives at all, and one that omits
 * the field rather than sending an empty list would otherwise throw and take
 * the whole page down with it.
 */
const offersOn = (card: PlatformCard) =>
  [card.best, ...(Array.isArray(card.alternatives) ? card.alternatives : [])].filter(Boolean);

function toResult(
  card: PlatformCard,
  nights: number,
  travellers: number,
  flight: FlightQuote | null,
): HolidayResult | null {
  const offers = offersOn(card).filter(bookable);
  const best = offers.sort((a, b) => a.price.total.amount - b.price.total.amount)[0];
  if (!best) return null;

  const room = toRoom(best);
  const stars = card.starRating === null ? null : Math.round(Number(card.starRating));
  // The platform quotes the cheapest whole trip for the whole party, so this
  // is added once. Multiplying it by head count would double-charge a family.
  const flightTotal = flight ? flight.tripTotal : null;
  const packageTotal = flightTotal === null ? null : room.total + flightTotal;
  const perPerson = (packageTotal ?? room.total) / Math.max(1, travellers);

  return {
    platformHotelId: card.hotelId,
    name: card.name,
    city: card.city,
    countryCode: card.countryCode,
    stars: stars && stars > 0 ? stars : null,
    image: card.image ? sharper(card.image) : null,
    nights,
    room,
    flight,
    packageTotal,
    perPerson: Math.round(perPerson),
    flightPending: flight === null,
  };
}

function compose(
  search: PlatformSearch,
  flights: FlightSearchResult,
  travellers: number,
): HolidaySearchPage {
  const flight = flights.quote;
  return {
    sessionId: search.sessionId,
    pending: search.pending,
    destinationLabel: search.destination.label,
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    nights: search.nights,
    total: search.total,
    nextOffset: search.page.nextOffset,
    results: search.cards
      .map((c) => toResult(c, search.nights, travellers, flight))
      .filter((r): r is HolidayResult => r !== null),
    flights,
    travellers,
  };
}

const roomsFor = (c: HolidayCriteria) => {
  // Children are put in the first room; the platform splits them across rooms itself
  // when it has to, and a family searching two rooms still prices as one party.
  const rooms: { adults: number; childAges: number[] }[] = [];
  const perRoom = Math.max(1, Math.floor(c.adults / c.rooms));
  let left = c.adults;
  for (let i = 0; i < c.rooms; i += 1) {
    const adults = i === c.rooms - 1 ? left : Math.min(perRoom, left);
    left -= adults;
    rooms.push({ adults, childAges: i === 0 ? c.childrenAges : [] });
  }
  return rooms.filter((r) => r.adults > 0);
};

const destinationOf = (c: HolidayCriteria) =>
  c.cityCode ? { cityCode: c.cityCode } : { text: c.destination };

/** What the customer has narrowed to, in the shape the platform filters on. */
export function filtersOf(c: HolidayCriteria): SearchFilters {
  const f: SearchFilters = {};
  if (c.refundable) f.refundable = true;
  if (c.board) f.board = [c.board];
  if (c.stars) f.minStars = Number(c.stars);
  return f;
}

/** Start a holiday search. Returns the first page; the caller polls for the rest. */
export async function startHolidaySearch(c: HolidayCriteria): Promise<HolidaySearchPage> {
  const checkOut = returnDateOf(c);
  const travellers = travellersIn(c);

  // The hotels and the flights are asked for at the same time: neither waits on
  // the other, and a flight search that cannot answer must not delay the page.
  const [search, flights] = await Promise.all([
    startSearch({
      destination: destinationOf(c),
      checkIn: c.departDate,
      checkOut,
      rooms: roomsFor(c),
      sort: c.sort,
      filters: filtersOf(c),
    }),
    searchFlights({
      origin: c.origin,
      destination: c.cityCode ? { code: c.cityCode } : { text: c.destination },
      departDate: c.departDate,
      returnDate: checkOut,
      adults: c.adults,
      childAges: c.childrenAges,
    }),
  ]);

  return compose(search, flights, travellers);
}

export type HolidayHotel = {
  platformHotelId: string;
  name: string;
  city: string;
  countryCode: string;
  stars: number | null;
  description: string | null;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  nights: number;
  travellers: number;
  /** Every room that can be confirmed on payment, cheapest first. */
  rooms: HolidayRoom[];
  flight: FlightQuote | null;
  flights: FlightSearchResult;
};

/**
 * One hotel, priced for these dates and this party.
 *
 * Asked for by its own id rather than read out of the search session, because a
 * customer can arrive on this page from a link, hours later, when that session
 * is long gone. The price has to be fetched fresh anyway: it is what they are
 * about to be asked to pay.
 */
export async function holidayHotel(
  platformHotelId: string,
  c: HolidayCriteria,
): Promise<HolidayHotel | null> {
  const checkOut = returnDateOf(c);
  if (!checkOut) return null;

  const [res, flights] = await Promise.all([
    searchHotels({
      destination: { hotelId: platformHotelId },
      checkIn: c.departDate,
      checkOut,
      rooms: roomsFor(c),
    }),
    searchFlights({
      origin: c.origin,
      destination: c.cityCode ? { code: c.cityCode } : { text: c.destination },
      departDate: c.departDate,
      returnDate: checkOut,
      adults: c.adults,
      childAges: c.childrenAges,
    }),
  ]);

  const card = res.cards.find((x) => x.hotelId.toLowerCase() === platformHotelId.toLowerCase());
  if (!card) return null;

  const rooms = offersOn(card)
    .filter(bookable)
    .map(toRoom)
    .sort((a, b) => a.total - b.total);
  if (!rooms.length) return null;

  const stars = card.starRating === null ? null : Math.round(Number(card.starRating));
  return {
    platformHotelId: card.hotelId,
    name: card.name,
    city: card.city,
    countryCode: card.countryCode,
    stars: stars && stars > 0 ? stars : null,
    description: card.description,
    image: card.image ? sharper(card.image) : null,
    latitude: card.latitude,
    longitude: card.longitude,
    nights: res.nights,
    travellers: travellersIn(c),
    rooms,
    flight: flights.quote,
    flights,
  };
}

/**
 * The same search again: more suppliers have answered, or the customer re-sorted.
 *
 * The flights are asked for again rather than carried back from the browser,
 * because nothing about a price may come from the browser. While flight search
 * is switched off that costs nothing; once it is live this should read a flight
 * result cached against the session rather than calling the supplier each poll.
 */
export async function readHolidaySearch(
  sessionId: string,
  c: HolidayCriteria,
  offset = 0,
): Promise<HolidaySearchPage> {
  const [search, flights] = await Promise.all([
    readSearch(sessionId, {
      sort: c.sort,
      offset,
      filters: filtersOf(c),
    }),
    searchFlights({
      origin: c.origin,
      destination: c.cityCode ? { code: c.cityCode } : { text: c.destination },
      departDate: c.departDate,
      returnDate: returnDateOf(c),
      adults: c.adults,
      childAges: c.childrenAges,
    }),
  ]);
  return compose(search, flights, travellersIn(c));
}
