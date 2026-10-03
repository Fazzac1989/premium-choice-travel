import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCheckout, type PlatformCheckout } from '@/lib/platform/client';

/**
 * A trip on this site booked through the platform: bring its row up to date with what the
 * platform says (founder, 2026-10-02). Confirmed: the platform's booking reference becomes the
 * trip's reference, it is paid, and the platform has already emailed the voucher. Not booked:
 * the trip is closed with the reason, and the card was never charged.
 */
export type TripSync = {
  state: 'confirmed' | 'waiting' | 'failed' | 'attention';
  reference: string | null;
  message: string | null;
};

export async function syncPlatformTrip(row: {
  id: number;
  platform_checkout_id?: string | null;
  supplier_reference?: string | null;
  status?: string | null;
}): Promise<TripSync> {
  if (!row.platform_checkout_id) return { state: 'waiting', reference: null, message: null };
  if (row.supplier_reference) return { state: 'confirmed', reference: row.supplier_reference, message: null };
  if (row.status === 'closed') return { state: 'failed', reference: null, message: null };

  let checkout: PlatformCheckout;
  try {
    checkout = await getCheckout(row.platform_checkout_id);
  } catch (e: any) {
    console.error('[trip sync]', e?.message);
    return { state: 'waiting', reference: null, message: null };
  }
  const db = createAdminClient();
  const now = new Date().toISOString();
  if (checkout.status === 'confirmed' && checkout.booking) {
    await db
      .from('booking_requests')
      .update({
        status: 'confirmed',
        supplier_reference: checkout.booking.reference,
        supplier_status: 'confirmed',
        supplier_confirmed_at: now,
        platform_booking_id: checkout.booking.id,
        paid_at: now,
        // the platform sent the customer their confirmation and voucher
        voucher_sent_at: now,
      })
      .eq('id', row.id);
    return { state: 'confirmed', reference: checkout.booking.reference, message: null };
  }
  if (checkout.status === 'failed' || checkout.status === 'expired') {
    await db
      .from('booking_requests')
      .update({ status: 'closed', supplier_remark: checkout.message ?? 'Not booked; nothing was charged.' })
      .eq('id', row.id);
    return { state: 'failed', reference: null, message: checkout.message };
  }
  if (checkout.status === 'needs_attention') {
    if (checkout.booking)
      await db.from('booking_requests').update({ platform_booking_id: checkout.booking.id }).eq('id', row.id);
    return { state: 'attention', reference: checkout.booking?.reference ?? null, message: checkout.message };
  }
  return { state: 'waiting', reference: null, message: null };
}
