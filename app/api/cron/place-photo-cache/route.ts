import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { hasPlacesKey } from '@/lib/images/google-places';
import { runPhotoCacheRefresh } from '@/lib/images/place-photo-cache';

/**
 * Daily refresh of the Places photo cache (schedule in vercel.json).
 *
 * Renews the oldest copies first, a bounded number per run, so every photo
 * is re-fetched within Google's 30-day window at roughly one call a month.
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` when that variable is
 * set; then nobody else can trigger a run. Without it the endpoint still
 * only ever refreshes copies that are due, so the worst an outsider can do
 * is bring a refresh forward.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_BUDGET = 40;
const MAX_BUDGET = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  if (!hasPlacesKey()) return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY is not set' }, { status: 503 });

  const asked = Number(req.nextUrl.searchParams.get('budget')) || DEFAULT_BUDGET;
  const budget = Math.min(Math.max(1, asked), MAX_BUDGET);

  try {
    const report = await runPhotoCacheRefresh(createAdminClient(), { budget });
    console.log('[place-photo-cache]', JSON.stringify(report));
    return NextResponse.json({ ok: true, budget, ...report });
  } catch (e: any) {
    console.error('[place-photo-cache]', e?.message);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e).slice(0, 300) }, { status: 500 });
  }
}
