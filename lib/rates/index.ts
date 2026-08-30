import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { hotelbeds } from './hotelbeds';
import { stub } from './stub';
import type { DisplayRate, RateProvider, RateQuote } from './types';

/**
 * The one way the site asks what a hotel costs.
 *
 * Every quote goes through the cache first. That is a commercial requirement,
 * not an optimisation: bed banks measure searches against bookings, and a site
 * that prices every visitor while booking offline is precisely the pattern
 * they throttle. One search should serve everyone looking at that weekend.
 */

// A real supplier always wins; the sample only runs when nothing else is set.
const PROVIDERS: RateProvider[] = [hotelbeds, stub];

/** How long a quote is treated as good enough to show. */
const CACHE_HOURS = 12;

export function activeProvider(): RateProvider | null {
  return PROVIDERS.find((p) => p.configured()) ?? null;
}

export function ratesEnabled() {
  return activeProvider() !== null;
}

function toDisplay(quote: RateQuote, cached: boolean): DisplayRate {
  return {
    status: 'quoted',
    sample: quote.provider === 'sample',
    perNight: Math.round(quote.amount / Math.max(1, quote.nights)),
    total: Math.round(quote.amount),
    currency: quote.currency,
    nights: quote.nights,
    board: quote.board,
    roomName: quote.roomName,
    cached,
  };
}

export async function getRate(params: {
  hotelId: number;
  supplierCode: string | null;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
}): Promise<DisplayRate> {
  const provider = activeProvider();
  if (!provider) return { status: 'off' };
  if (!params.supplierCode) return { status: 'unmapped' };
  if (!isSupabaseConfigured()) return { status: 'off' };

  const children = params.children ?? 0;
  const db = createAdminClient();

  const { data: hit } = await db
    .from('rate_cache')
    .select('*')
    .eq('hotel_id', params.hotelId)
    .eq('check_in', params.checkIn)
    .eq('nights', params.nights)
    .eq('adults', params.adults)
    .eq('children', children)
    .maybeSingle();

  const fresh = hit && Date.now() - new Date(hit.fetched_at).getTime() < CACHE_HOURS * 3600_000;
  if (fresh) {
    if (hit.amount === null) return { status: 'unavailable', cached: true };
    return toDisplay(
      {
        amount: Number(hit.amount),
        currency: hit.currency,
        nights: hit.nights,
        board: hit.board ?? '',
        roomName: hit.room_name ?? '',
        provider: hit.provider,
      },
      true,
    );
  }

  let quote: RateQuote | null = null;
  try {
    quote = await provider.quote({
      hotelId: params.hotelId,
      supplierCode: params.supplierCode,
      checkIn: params.checkIn,
      nights: params.nights,
      adults: params.adults,
      children,
    });
  } catch (e: any) {
    console.error('[rates]', provider.name, e?.message);
    // A failed lookup is not an answer, so it is never cached — but a stale
    // cached quote is better than showing the visitor nothing.
    if (hit && hit.amount !== null) {
      return toDisplay(
        {
          amount: Number(hit.amount),
          currency: hit.currency,
          nights: hit.nights,
          board: hit.board ?? '',
          roomName: hit.room_name ?? '',
          provider: hit.provider,
        },
        true,
      );
    }
    return { status: 'unavailable' };
  }

  await db.from('rate_cache').upsert(
    {
      hotel_id: params.hotelId,
      check_in: params.checkIn,
      nights: params.nights,
      adults: params.adults,
      children,
      currency: quote?.currency ?? 'AED',
      amount: quote ? quote.amount : null,
      board: quote?.board ?? null,
      room_name: quote?.roomName ?? null,
      provider: provider.name,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'hotel_id,check_in,nights,adults,children' },
  );

  return quote ? toDisplay(quote, false) : { status: 'unavailable' };
}
