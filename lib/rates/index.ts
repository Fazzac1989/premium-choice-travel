import 'server-only';
import { platformConfigured } from '@/lib/platform/client';

/**
 * Whether live prices can be shown, and to whom. The trade platform is the only rates provider
 * (founder, 2026-10-02): it holds every supplier, prices with the Staycations markup and caches
 * the suppliers' answers itself, so the site keeps no price cache of its own. The searches,
 * rooms and bookings are in lib/staycations/stay-search-server.ts and lib/platform/.
 */

export function activeProvider(): { name: 'platform' } | null {
  return platformConfigured() ? { name: 'platform' } : null;
}

export function ratesEnabled() {
  return activeProvider() !== null;
}

/**
 * Whether this visitor may see live prices: only a signed-in customer (founder, 2026-10-02:
 * "in order to see real prices and confirm, the user should sign in or register"). Everyone
 * else sees the hotels with their guide prices.
 */
export function ratesVisible(signedIn: boolean) {
  return ratesEnabled() && signedIn;
}

/** A stay's cheapest room for a search, as the curated cards show it. */
export type StayRate = {
  hotelId: number;
  total: number;
  currency: string;
  board: string;
  roomName: string;
  /** True when it came from a cache rather than a fresh supplier call. */
  cached: boolean;
};
