'use server';

import { PlatformError } from '@/lib/platform/client';
import { readHolidaySearch, type HolidaySearchPage } from './holiday-search';
import { parseHolidayCriteria, type HolidayCriteria } from './search-criteria';

/**
 * What the holiday results page asks the server for from the browser.
 *
 * The platform key never leaves the server, and the criteria are re-parsed here
 * rather than trusted as given: the browser may say what was searched for, but
 * it may not say what anything costs.
 */

export type PollResult =
  | { ok: true; page: HolidaySearchPage }
  | { ok: false; message: string };

const isSession = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

/** Read a running search again: more suppliers have answered, or the next page. */
export async function pollHolidaySearch(
  sessionId: string,
  params: Record<string, string>,
  offset = 0,
): Promise<PollResult> {
  if (!isSession(sessionId)) return { ok: false, message: 'Search again.' };
  // Re-parsed, so a hand-edited party or date cannot reach a supplier unchecked.
  const criteria: HolidayCriteria = parseHolidayCriteria(params);
  try {
    const page = await readHolidaySearch(sessionId, criteria, Math.max(0, Math.floor(offset)));
    return { ok: true, page };
  } catch (e) {
    if (e instanceof PlatformError) {
      if (e.status === 404 || e.status === 410)
        return { ok: false, message: 'That search has expired. Search again to see live prices.' };
      return { ok: false, message: e.message };
    }
    console.error('[poll holiday search]', e instanceof Error ? e.message : e);
    return { ok: false, message: 'We lost touch with our suppliers. Please try again in a moment.' };
  }
}
