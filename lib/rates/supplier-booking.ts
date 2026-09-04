import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  HotelbedsError,
  hotelbedsBook,
  hotelbedsCancel,
  hotelbedsCheckRate,
  hotelbedsHotelDetails,
  type SupplierBooking,
  type SupplierPax,
} from './hotelbeds';
import { convertMoney, convertOffers } from './fx';
import { emailShell, sendEmail } from '@/lib/email-core';
import { emailBrand } from '@/lib/email-brand-core';
import VoucherDoc from '@/lib/pdf/voucher-doc';
import { voucherModel } from '@/lib/voucher-model';

/**
 * Confirming, vouchering and cancelling a booking request with Hotelbeds.
 *
 * This is the whole of the specialist's flow, written against a Supabase
 * client rather than the request cookie, so the admin's server actions and
 * the integration test script run exactly the same code. Nothing here reads
 * a session: the caller has already decided who is allowed to do this.
 */

export type Outcome = { ok: boolean; note: string };

export function describeSupplierError(e: any) {
  if (e instanceof HotelbedsError) {
    if (e.rateGone) return 'Hotelbeds no longer sells that rate key — use "Search again for this room", then confirm.';
    if (e.quotaOrForbidden) return `Hotelbeds refused the call (${e.status}) — the daily test quota may be spent, or the key is not allowed. ${e.detail}`;
    return `Hotelbeds said: ${e.detail}`;
  }
  return String(e?.message ?? e);
}

export function money(n: number, currency: string) {
  return `${currency} ${Math.round(n).toLocaleString('en-GB')}`;
}

export async function loadRequest(db: SupabaseClient, id: number) {
  const { data, error } = await db.from('booking_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveRequest(db: SupabaseClient, id: number, patch: Record<string, unknown>) {
  const { error } = await db.from('booking_requests').update(patch).eq('id', id);
  if (error) {
    throw new Error(
      /column .* does not exist|schema cache/i.test(error.message)
        ? 'The booking columns are missing — paste supabase/migrations/018-supplier-bookings.sql into the Supabase SQL editor, then try again.'
        : error.message,
    );
  }
}

/** Why a request cannot be booked through Hotelbeds, or null when it can. */
export function bookingBlocker(row: any, providerName: string | null) {
  if (providerName !== 'hotelbeds') return 'Hotelbeds is not the active rates provider on this deployment.';
  if (row.provider && row.provider !== 'hotelbeds') return `This request was priced by ${row.provider}, not Hotelbeds — it has to be booked by hand.`;
  if (!row.offer_id) return 'This request carries no supplier rate to book.';
  return null;
}

export function voucherFilename(row: any) {
  const hotel = String(row?.hotel_name ?? 'hotel').replace(/[^\w\s-]/g, '').trim();
  return `Voucher ${row?.supplier_reference ?? ''} - ${hotel}.pdf`;
}

/** The voucher PDF for a confirmed request, or null when nothing is confirmed. */
export async function renderVoucherPdf(row: any): Promise<Buffer | null> {
  const v = voucherModel(row);
  if (!v) return null;
  return renderToBuffer(createElement(VoucherDoc, { v }) as any);
}

/** Email the voucher to the customer, with a copy to the team inbox. */
export async function emailVoucherFor(db: SupabaseClient, row: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const pdf = await renderVoucherPdf(row);
    if (!pdf) return { ok: false, error: 'nothing confirmed to print' };
    const brand = emailBrand('staycations');
    const staff = process.env.ENQUIRY_NOTIFY_EMAIL;
    const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const res = await sendEmail({
      to: [row.email, staff].filter(Boolean).join(', '),
      subject: `Your hotel voucher — ${row.hotel_name} (${row.supplier_reference})`,
      html: emailShell({
        brand,
        eyebrow: 'Booking confirmed',
        title: `${row.hotel_name} is booked`,
        bodyHtml:
          `<p>Dear ${esc(row.holder_name || row.name)},</p>` +
          `<p>Your stay at <strong>${esc(row.hotel_name)}</strong> from ${esc(row.check_in)} for ${row.nights} night${row.nights === 1 ? '' : 's'} is confirmed. ` +
          `Your voucher is attached — please show it at check-in. The booking reference is <strong>${esc(row.supplier_reference)}</strong>.</p>` +
          (row.rate_comments ? `<p><strong>Please note:</strong> ${esc(row.rate_comments).replace(/\n/g, '<br>')}</p>` : '') +
          `<p>Anything at all before you travel, call us on +971 4 420 6965.</p>`,
      }),
      attachments: [{ filename: voucherFilename(row), content: pdf }],
    });
    if (res.ok && !res.skipped) await saveRequest(db, row.id, { voucher_sent_at: new Date().toISOString() });
    if (!res.ok) return { ok: false, error: res.error };
    return res.skipped ? { ok: false, error: 'email is not configured (RESEND_API_KEY)' } : { ok: true };
  } catch (e: any) {
    console.error('[voucher email]', e?.message ?? e);
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/** Ask Hotelbeds to re-price the exact rate key. Required before a RECHECK rate is confirmed. */
export async function recheckRequest(db: SupabaseClient, row: any): Promise<Outcome> {
  let checked;
  try {
    checked = await hotelbedsCheckRate(row.offer_id);
  } catch (e: any) {
    return { ok: false, note: describeSupplierError(e) };
  }
  if (!checked) return { ok: false, note: 'Hotelbeds could not re-check that rate. Use "Search again for this room".' };
  const [c] = await convertOffers([checked]);
  const before = Number(row.amount);
  await saveRequest(db, row.id, {
    rate_comments: c.comments ?? row.rate_comments ?? null,
    supplier_recheck: {
      at: new Date().toISOString(),
      total: c.total,
      net: c.net,
      currency: c.currency,
      rateType: c.rateType ?? 'BOOKABLE',
      comments: c.comments ?? '',
      source: 'checkrate',
    },
  });
  const moved = Math.abs(c.total - before) >= 1;
  return {
    ok: true,
    note:
      `Re-checked: ${money(c.total, c.currency)}${moved ? ` — was ${money(before, row.currency)}. Confirm the new price with the customer first.` : ', unchanged.'}` +
      (c.comments ? ' Rate comments updated.' : ''),
  };
}

export type ConfirmInput = {
  holder: { name: string; surname: string };
  paxes: SupplierPax[];
  remark: string;
};

/** POST the booking to Hotelbeds, store the reply on the request, email the voucher. */
export async function confirmRequest(db: SupabaseClient, row: any, input: ConfirmInput): Promise<Outcome & { reference?: string }> {
  if (row.supplier_reference) return { ok: false, note: `Already confirmed — Hotelbeds reference ${row.supplier_reference}.` };
  if (!input.holder.name || !input.holder.surname) return { ok: false, note: 'The lead guest needs a first name and a surname, as in the passport.' };

  // A RECHECK rate must be re-priced first; the supplier requires it.
  const recheck = row.supplier_recheck ?? null;
  if (recheck?.rateType === 'RECHECK' && (recheck.source !== 'checkrate' || Date.now() - new Date(recheck.at).getTime() > 30 * 60_000)) {
    return { ok: false, note: 'This rate is marked RECHECK by Hotelbeds — press "Re-check this rate" first, then confirm within 30 minutes.' };
  }

  let booking: SupplierBooking;
  try {
    booking = await hotelbedsBook({
      rateKey: row.offer_id,
      holder: input.holder,
      paxes: input.paxes,
      clientReference: `PCS-${row.id}`,
      remark: input.remark,
    });
  } catch (e: any) {
    console.error('[hotelbeds book]', e?.message ?? e);
    return { ok: false, note: describeSupplierError(e) };
  }

  // The voucher wants the address and phone; the booking reply has neither.
  let details: any = null;
  try {
    details = await hotelbedsHotelDetails(booking.hotel.code);
  } catch (e: any) {
    console.error('[hotelbeds details]', e?.message ?? e);
  }

  const cost = await convertMoney(booking.totalNet, booking.currency || 'EUR');
  const comments = [row.rate_comments, ...booking.hotel.rooms.flatMap((r) => r.rates.map((x) => x.rateComments))]
    .map((c) => String(c ?? '').trim())
    .filter(Boolean)
    .filter((c, i, a) => a.indexOf(c) === i)
    .join('\n');

  await saveRequest(db, row.id, {
    status: 'confirmed',
    holder_name: input.holder.name,
    holder_surname: input.holder.surname,
    paxes: input.paxes,
    supplier_remark: input.remark || null,
    supplier_reference: booking.reference,
    supplier_status: booking.status,
    supplier_booking: booking,
    supplier_hotel: details,
    supplier_confirmed_at: new Date().toISOString(),
    net_amount: cost.amount,
    rate_comments: comments || null,
  });

  const fresh = await loadRequest(db, row.id);
  const sent = await emailVoucherFor(db, fresh);
  return {
    ok: true,
    reference: booking.reference,
    note:
      `Confirmed with Hotelbeds — reference ${booking.reference}, status ${booking.status}, net ${money(cost.amount, cost.currency)}.` +
      (sent.ok ? ` Voucher emailed to ${row.email}.` : ` Voucher NOT emailed: ${sent.error ?? 'unknown error'} — use "Email voucher" to retry.`),
  };
}

/** Cancel with Hotelbeds and record what the supplier said it will charge. */
export async function cancelRequest(db: SupabaseClient, row: any): Promise<Outcome> {
  if (!row.supplier_reference) return { ok: false, note: 'Nothing is confirmed with Hotelbeds for this request.' };
  if (row.supplier_cancelled_at) return { ok: false, note: 'Already cancelled with Hotelbeds.' };
  let result: SupplierBooking;
  try {
    result = await hotelbedsCancel(row.supplier_reference);
  } catch (e: any) {
    console.error('[hotelbeds cancel]', e?.message ?? e);
    return { ok: false, note: describeSupplierError(e) };
  }
  const charge = await convertMoney(result.totalNet, result.currency || 'EUR');
  await saveRequest(db, row.id, {
    status: 'closed',
    supplier_status: result.status,
    supplier_cancelled_at: new Date().toISOString(),
    cancellation_cost: charge.amount,
    supplier_booking: { ...row.supplier_booking, cancellation: result },
  });
  return {
    ok: true,
    note: `Cancelled with Hotelbeds — status ${result.status}. Cancellation charge reported by the supplier: ${money(charge.amount, charge.currency)}. Tell the customer.`,
  };
}
