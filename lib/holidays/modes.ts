import 'server-only';
import { flightsEnabled } from '@/lib/platform/flights';
import type { SearchMode } from './search-criteria';

/**
 * Which search tabs this site can honestly offer.
 *
 * Flights appear only once the platform can price them — Travelopro has to be
 * live and PLATFORM_FLIGHTS switched on. Offering the tab before that would
 * put a customer through a search that cannot answer, which is worse than one
 * fewer tab.
 *
 * Hotels and Flight + Hotel both run on the hotel search today. They are not
 * the same product, though: one is a room, the other is a room with a flight a
 * specialist will price alongside it, and the pages say so differently.
 */
export function availableModes(): SearchMode[] {
  const modes: SearchMode[] = ['package', 'hotel'];
  if (flightsEnabled()) modes.push('flight');
  return modes;
}
