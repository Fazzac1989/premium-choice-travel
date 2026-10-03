'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAccount } from '@/lib/account';
import { ownedBooking } from '@/lib/trips/portal';
import { cancelBooking, cancellationPreview, PlatformError } from '@/lib/platform/client';

/**
 * A customer cancels their own stay (founder, 2026-10-02: "self-cancel"). They see what
 * cancelling costs today under the hotel's terms first; cancelling then charges exactly that,
 * and the rest goes back to their card. The platform does the cancelling and the refund.
 */

export type CancelPreview =
  | { ok: true; charge: number; refund: number; currency: string; text: string }
  | { ok: false; text: string };

const fmt = (minor: number, currency: string) =>
  `${currency} ${(minor / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function mine(bookingId: number) {
  const account = await getAccount();
  if (!account) return null;
  const booking = await ownedBooking(bookingId, account);
  return booking?.platform_booking_id && !booking.supplier_cancelled_at ? booking : null;
}

export async function previewTripCancel(bookingId: number): Promise<CancelPreview> {
  const booking = await mine(bookingId);
  if (!booking) return { ok: false, text: 'We could not find that stay on your account.' };
  try {
    const p = await cancellationPreview(booking.platform_booking_id);
    if (!p.changeable)
      return {
        ok: false,
        text: 'This stay can no longer be cancelled online. Please call us on +971 4 420 6965.',
      };
    const c = p.chargeAmount.currency;
    return {
      ok: true,
      charge: p.chargeAmount.amount,
      refund: p.refund.amount,
      currency: c,
      text:
        p.chargeAmount.amount === 0
          ? `Cancelling today is free. ${fmt(p.refund.amount, c)} goes back to the card you paid with.`
          : p.refund.amount > 0
            ? `Cancelling today costs ${fmt(p.chargeAmount.amount, c)} under the hotel's terms. ${fmt(p.refund.amount, c)} goes back to the card you paid with.`
            : `Cancelling today costs the full ${fmt(p.chargeAmount.amount, c)} under the hotel's terms; nothing is refunded.`,
    };
  } catch (e) {
    return {
      ok: false,
      text: e instanceof PlatformError ? `${e.message}${e.next ? ` ${e.next}` : ''}` : 'We could not check that just now.',
    };
  }
}

export async function cancelTrip(bookingId: number): Promise<{ ok: boolean; text: string }> {
  const booking = await mine(bookingId);
  if (!booking) return { ok: false, text: 'We could not find that stay on your account.' };
  // the charge is worked out again now: the customer agrees to today's figure, not an old one
  const preview = await previewTripCancel(bookingId);
  if (!preview.ok) return { ok: false, text: preview.text };
  try {
    await cancelBooking(
      booking.platform_booking_id,
      { amount: preview.charge, currency: preview.currency },
      'Cancelled by the customer online',
    );
  } catch (e) {
    return {
      ok: false,
      text:
        e instanceof PlatformError
          ? `${e.message}${e.next ? ` ${e.next}` : ''}`
          : 'We could not cancel that just now. Nothing was cancelled; please try again or call us.',
    };
  }
  const db = createAdminClient();
  await db
    .from('booking_requests')
    .update({
      supplier_cancelled_at: new Date().toISOString(),
      supplier_status: 'cancelled',
      cancellation_cost: preview.charge / 100,
    })
    .eq('id', booking.id);
  revalidatePath('/trips');
  revalidatePath('/sites/staycations/trips');
  return {
    ok: true,
    text:
      preview.refund > 0
        ? `Cancelled. ${fmt(preview.refund, preview.currency)} is on its way back to your card; we have emailed you the details.`
        : 'Cancelled. We have emailed you the details.',
  };
}
