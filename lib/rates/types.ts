/**
 * A supplier-agnostic shape for hotel rates.
 *
 * Premium Choice quotes; it does not sell online. So a provider only ever has
 * to answer one question — "what does this hotel cost for these dates?" — and
 * never has to book, hold or cancel anything. That keeps the interface small
 * enough that swapping Hotelbeds for WebBeds, TBO or a direct contract is a
 * new file rather than a new architecture.
 */

export type RateQuery = {
  hotelId: number;
  /** The hotel's id in the supplier's catalogue. No code, no quote. */
  supplierCode: string;
  checkIn: string;
  nights: number;
  adults: number;
  children: number;
  /** Ages when known; suppliers price children by age, not by count. */
  childrenAges?: number[];
};

export type RateQuote = {
  /** Total for the whole stay, not per night — per night is derived for display. */
  amount: number;
  currency: string;
  nights: number;
  board: string;
  roomName: string;
  provider: string;
};

export interface RateProvider {
  readonly name: string;
  /** False when credentials are absent — the site then behaves as it does today. */
  configured(): boolean;
  /**
   * A quote, or null when the supplier has nothing for these dates. Null is an
   * answer and gets cached; throwing means the lookup failed and should not be.
   */
  quote(query: RateQuery): Promise<RateQuote | null>;
  /**
   * Every bookable room option for the dates — the heavier call behind the
   * booking page. Absent on a provider that can only give a headline price.
   */
  offers?(query: RateQuery): Promise<RoomOffer[]>;
  /** Whether a stored supplier code belongs to this provider's catalogue. */
  ownsCode?(code: string): boolean;
}

/** What the page receives — never a raw supplier response. */
export type DisplayRate = {
  status: 'quoted' | 'unavailable' | 'unmapped' | 'off';
  perNight?: number;
  total?: number;
  currency?: string;
  nights?: number;
  board?: string;
  roomName?: string;
  /** True when this came from the cache rather than a fresh supplier call. */
  cached?: boolean;
  /** True when the figure is invented by the sample provider, not a supplier. */
  sample?: boolean;
};

/**
 * One bookable room option.
 *
 * `total` is what the customer is shown — LiteAPI's suggestedSellingPrice,
 * not its confusingly named retailRate.total, which is our net cost. `net`
 * never leaves the server: it goes to the specialist with the request and is
 * stripped from anything sent to a browser.
 */
export type RoomOffer = {
  offerId: string;
  roomName: string;
  board: string;
  /** null when the supplier did not say. */
  refundable: boolean | null;
  /** Free cancellation deadline, as the supplier gave it. */
  cancelBy: string | null;
  total: number;
  net: number | null;
  currency: string;
  /** Charges the supplier says are collected at the hotel, not in the price. */
  extraFees: { description: string; amount: number; currency: string }[];
};

/** The same offer with our cost removed, safe to send to the page. */
export type PublicRoomOffer = Omit<RoomOffer, 'net'>;

export function toPublicOffer(o: RoomOffer): PublicRoomOffer {
  const { net, ...rest } = o;
  return rest;
}
