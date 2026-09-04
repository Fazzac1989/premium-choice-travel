import { NextResponse } from 'next/server';
import { getStaycationHotels } from '@/lib/data';
import { toHotelCard } from '@/lib/staycations/hotel-card';

/**
 * The directory as card data — what the app's Saved tab renders from the
 * shortlist kept in the browser. The service worker keeps a copy so the
 * shortlist still opens offline.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const hotels = (await getStaycationHotels()).map(toHotelCard);
  return NextResponse.json(
    { hotels },
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  );
}
