import { NextResponse } from 'next/server';
import { getStaycationHotels } from '@/lib/data';
import { toStayCard } from '@/lib/staycations/stay-card';
import { EMPTY_CRITERIA } from '@/lib/staycations/search-criteria';

/**
 * The directory as card data — what the app's Saved tab renders from the
 * shortlist kept in the browser. The service worker keeps a copy so the
 * shortlist still opens offline.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  // No dates here, so no prices — the page adds the stay being planned.
  const hotels = (await getStaycationHotels()).map((h) => toStayCard(h, EMPTY_CRITERIA, ''));
  return NextResponse.json(
    { hotels },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  );
}
