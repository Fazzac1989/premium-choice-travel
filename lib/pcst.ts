import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Read-only window into the Premium Choice School Trips platform, so the
 * master console can show group-wide numbers. Editing stays in the dedicated
 * School Trips admin — deep-linked from the dashboard.
 */

export type PcstStats = {
  trips: number;
  publishedTrips: number;
  quotes: number;
  appointments: number;
};

export const PCST_ADMIN_URL =
  process.env.PCST_ADMIN_URL ?? 'https://premiumchoiceschooltrips.com/admin';

export function isPcstConfigured() {
  return Boolean(process.env.PCST_SUPABASE_URL && process.env.PCST_SUPABASE_SERVICE_ROLE_KEY);
}

export async function getPcstStats(): Promise<PcstStats | null> {
  if (!isPcstConfigured()) return null;
  try {
    const db = createClient(
      process.env.PCST_SUPABASE_URL!,
      process.env.PCST_SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) },
      }
    );
    const [trips, published, quotes, appointments] = await Promise.all([
      db.from('trips').select('id', { count: 'exact', head: true }),
      db.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      db.from('quotes').select('id', { count: 'exact', head: true }),
      db.from('appointments').select('id', { count: 'exact', head: true }),
    ]);
    return {
      trips: trips.count ?? 0,
      publishedTrips: published.count ?? 0,
      quotes: quotes.count ?? 0,
      appointments: appointments.count ?? 0,
    };
  } catch (e: any) {
    console.error('[pcst stats]', e?.message);
    return null;
  }
}
