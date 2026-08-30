'use server';

import { getRate } from '@/lib/rates';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import type { DisplayRate } from '@/lib/rates/types';

/**
 * Price one hotel for one set of dates, on request.
 *
 * Called from a button rather than on page load, so a supplier search only
 * happens when someone has actually asked. The supplier code is read here
 * rather than passed in, so a visitor cannot aim our credentials at an
 * arbitrary property.
 */
export async function checkRate(params: {
  hotelId: number;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
}): Promise<DisplayRate> {
  if (!isSupabaseConfigured()) return { status: 'off' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.checkIn)) return { status: 'unavailable' };

  const nights = Math.max(1, Math.min(30, Number(params.nights) || 1));
  const adults = Math.max(1, Math.min(12, Number(params.adults) || 2));
  const children = Math.max(0, Math.min(8, Number(params.children) || 0));

  const db = createAdminClient();
  const { data: hotel } = await db
    .from('hotels')
    .select('id, supplier_code, status')
    .eq('id', params.hotelId)
    .maybeSingle();

  if (!hotel || hotel.status === 'draft') return { status: 'off' };

  return getRate({
    hotelId: hotel.id,
    supplierCode: hotel.supplier_code ?? null,
    checkIn: params.checkIn,
    nights,
    adults,
    children,
  });
}
