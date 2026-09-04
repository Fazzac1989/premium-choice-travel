'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';
import { activeProvider, getOffers } from '@/lib/rates';
import { convertMoney, convertOffers } from '@/lib/rates/fx';
import {
  HotelbedsError,
  hotelbedsBook,
  hotelbedsCancel,
  hotelbedsCheckRate,
  hotelbedsHotelDetails,
  type SupplierBooking,
  type SupplierPax,
} from '@/lib/rates/hotelbeds';
import type { RoomOffer } from '@/lib/rates/types';
import { emailShell, sendEmail } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';
import { renderVoucher, voucherFilename } from '@/lib/voucher';

/**
 * The specialist's half of a Hotelbeds booking.
 *
 * A customer's request is never confirmed by the site on its own. From the
 * request page a specialist can re-check the rate, search again if the rate
 * key has expired, confirm the booking with Hotelbeds, email the voucher,
 * and cancel. Every step writes what the supplier said back to the request,
 * so the voucher can be reprinted and a dispute answered without asking again.
 *
 * Workflow discipline (Hotelbeds certifies this): availability is only
 * repeated when the specialist asks for it, CheckRate is used before a
 * RECHECK rate, and the booking call carries the rate key it was quoted on.
 */

function back(id: number, note: string): never {
  revalidatePath('/admin/requests');
  revalidatePath(`/admin/requests/${id}`);
  redirect(`/admin/requests/${id}?note=${encodeURIComponent(note)}`);
}

async function loadRequest(id: number) {
  const db = createAdminClient();
  const { data, error } = await db.from('booking_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function needsMigration(message: string) {
  return /column .* does not exist|schema cache/i.test(message);
}

async function saveRequest(id: number, patch: Record<string, unknown>) {
  const db = createAdminClient();
  const { error } = await db.from('booking_requests').update(patch).eq('id', id);
  if (error) {
    throw new Error(
      needsMigration(error.message)
        ? 'The booking columns are missing — paste supabase/migrations/018-supplier-bookings.sql into the Supabase SQL editor, then try again.'
        : error.message,
    );
  }
}

function hotelbedsOnly(row: any) {
  const provider = activeProvider();
  if (!provider || provider.name !== 'hotelbeds') return 'Hotelbeds is not the active rates provider on this deployment.';
  if (row.provider && row.provider !== 'hotelbeds') return `This request was priced by ${row.provider}, not Hotelbeds — it has to be booked by hand.`;
  if (!row.offer_id) return 'This request carries no supplier rate to book.';
  return null;
}

function describeError(e: any) {
  if (e instanceof HotelbedsError) {
    if (e.rateGone) return 'Hotelbeds no longer sells that rate key — use "Search again for this room", then confirm.';
    if (e.quotaOrForbidden) return `Hotelbeds refused the call (${e.status}) — the daily test quota may be spent, or the key is not allowed. ${e.detail}`;
    return `Hotelbeds said: ${e.detail}`;
  }
  return String(e?.message ?? e);
}

function sameRoom(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/\(pay at the hotel\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return norm(a) === norm(b);
}

function money(n: number, currency: string) {
  return `${currency} ${Math.round(n).toLocaleString('en-GB')}`;
}

/**
 * Search again for the room the customer chose and move the request onto the
 * current rate key and price. Used when hours have passed and the original
 * key has expired, or when the specialist wants today's price.
 */
export async function refreshSupplierOffer(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const row = await loadRequest(id);
  if (!row) return;
  const blocked = hotelbedsOnly(row);
  if (blocked) back(id, blocked);
  if (row.supplier_reference) back(id, 'Already confirmed with Hotelbeds — nothing to refresh.');

  const db = createAdminClient();
  const { data: hotel } = await db.from('hotels').select('supplier_code').eq('id', row.hotel_id).maybeSingle();
  let offers: RoomOffer[] = [];
  try {
    offers = await getOffers(
      {
        hotelId: row.hotel_id,
        supplierCode: hotel?.supplier_code ?? null,
        checkIn: row.check_in,
        nights: row.nights,
        adults: row.adults,
        children: row.children,
        childrenAges: row.children_ages ?? [],
      },
      { force: true },
    );
  } catch (e: any) {
    back(id, describeError(e));
  }
  if (!offers.length) back(id, 'Hotelbeds returned nothing for these dates now. Price it by hand or ask the customer for other dates.');

  const exact = offers.find((o) => sameRoom(o.roomName, row.room_name ?? '') && o.board === row.board && o.refundable === row.refundable);
  const loose = exact ?? offers.find((o) => sameRoom(o.roomName, row.room_name ?? '') && o.board === row.board) ?? offers.find((o) => sameRoom(o.roomName, row.room_name ?? ''));
  if (!loose) back(id, `That room is no longer offered for these dates. Cheapest now: ${offers[0].roomName} · ${offers[0].board} at ${money(offers[0].total, offers[0].currency)}.`);

  const before = Number(row.amount);
  const fees = loose.extraFees.map((f) => `${f.currency} ${f.amount} ${f.description}`).join(', ');
  await saveRequest(id, {
    offer_id: loose.offerId,
    room_name: loose.roomName,
    board: loose.board,
    refundable: loose.refundable,
    cancel_by: loose.cancelBy,
    currency: loose.currency,
    amount: loose.total,
    net_amount: loose.net,
    extra_fees: fees || null,
    rate_comments: loose.comments ?? null,
    supplier_recheck: {
      at: new Date().toISOString(),
      total: loose.total,
      net: loose.net,
      currency: loose.currency,
      rateType: loose.rateType ?? 'BOOKABLE',
      comments: loose.comments ?? '',
      source: 'availability',
    },
  });
  const moved = Math.abs(loose.total - before) >= 1;
  back(
    id,
    `Rate refreshed${exact ? '' : ' (closest match)'}: ${loose.roomName} · ${loose.board} at ${money(loose.total, loose.currency)}` +
      (moved ? ` — was ${money(before, row.currency)}. Tell the customer before confirming.` : ' — unchanged.'),
  );
}

/** Ask Hotelbeds to re-price the exact rate key before confirming. Required for RECHECK rates. */
export async function recheckSupplierRate(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const row = await loadRequest(id);
  if (!row) return;
  const blocked = hotelbedsOnly(row);
  if (blocked) back(id, blocked);
  if (row.supplier_reference) back(id, 'Already confirmed with Hotelbeds.');

  let checked: RoomOffer | null = null;
  try {
    checked = await hotelbedsCheckRate(row.offer_id);
  } catch (e: any) {
    back(id, describeError(e));
  }
  if (!checked) back(id, 'Hotelbeds could not re-check that rate. Use "Search again for this room".');
  const [c] = await convertOffers([checked]);
  const before = Number(row.amount);
  await saveRequest(id, {
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
  back(
    id,
    `Re-checked: ${money(c.total, c.currency)}${moved ? ` — was ${money(before, row.currency)}. Confirm the new price with the customer first.` : ', unchanged.'}` +
      (c.comments ? ' Rate comments updated.' : ''),
  );
}

function paxesFrom(formData: FormData, row: any, holder: { name: string; surname: string }): SupplierPax[] {
  const paxes: SupplierPax[] = [];
  for (let i = 1; i <= Number(row.adults); i++) {
    const name = String(formData.get(`ad${i}_name`) ?? '').trim();
    const surname = String(formData.get(`ad${i}_surname`) ?? '').trim();
    if (i === 1) paxes.push({ type: 'AD', name: name || holder.name, surname: surname || holder.surname });
    else if (name || surname) paxes.push({ type: 'AD', name, surname });
  }
  const ages: number[] = Array.isArray(row.children_ages) ? row.children_ages : [];
  for (let i = 1; i <= Number(row.children); i++) {
    const age = Number(formData.get(`ch${i}_age`));
    paxes.push({
      type: 'CH',
      name: String(formData.get(`ch${i}_name`) ?? '').trim(),
      surname: String(formData.get(`ch${i}_surname`) ?? '').trim() || holder.surname,
      age: Number.isFinite(age) && age >= 0 && age <= 17 ? age : ages[i - 1] ?? 8,
    });
  }
  return paxes;
}

/** POST the booking to Hotelbeds, store the reply, send the voucher. */
export async function confirmSupplierBooking(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const row = await loadRequest(id);
  if (!row) return;
  const blocked = hotelbedsOnly(row);
  if (blocked) back(id, blocked);
  if (row.supplier_reference) back(id, `Already confirmed — Hotelbeds reference ${row.supplier_reference}.`);
  if (String(formData.get('agreed')) !== 'yes') back(id, 'Tick the box to say the customer has agreed the price and terms.');

  const holder = {
    name: String(formData.get('holder_name') ?? '').trim(),
    surname: String(formData.get('holder_surname') ?? '').trim(),
  };
  if (!holder.name || !holder.surname) back(id, 'The lead guest needs a first name and a surname, as in the passport.');

  // A RECHECK rate must be re-priced first; the supplier requires it.
  const recheck = row.supplier_recheck ?? null;
  if (recheck?.rateType === 'RECHECK' && (recheck.source !== 'checkrate' || Date.now() - new Date(recheck.at).getTime() > 30 * 60_000)) {
    back(id, 'This rate is marked RECHECK by Hotelbeds — press "Re-check this rate" first, then confirm within 30 minutes.');
  }

  const paxes = paxesFrom(formData, row, holder);
  const remark = String(formData.get('remark') ?? '').trim();

  let booking: SupplierBooking;
  try {
    booking = await hotelbedsBook({
      rateKey: row.offer_id,
      holder,
      paxes,
      clientReference: `PCS-${id}`,
      remark,
    });
  } catch (e: any) {
    console.error('[hotelbeds book]', e?.message ?? e);
    back(id, describeError(e));
  }

  // The voucher wants the address and phone; the booking reply has neither.
  let details: any = null;
  try {
    details = await hotelbedsHotelDetails(booking.hotel.code);
  } catch (e: any) {
    console.error('[hotelbeds details]', e?.message ?? e);
  }

  const cost = await convertMoney(booking.totalNet, booking.currency || 'EUR');
  await saveRequest(id, {
    status: 'confirmed',
    holder_name: holder.name,
    holder_surname: holder.surname,
    paxes,
    supplier_remark: remark || null,
    supplier_reference: booking.reference,
    supplier_status: booking.status,
    supplier_booking: booking,
    supplier_hotel: details,
    supplier_confirmed_at: new Date().toISOString(),
    net_amount: cost.amount,
    rate_comments:
      [row.rate_comments, ...booking.hotel.rooms.flatMap((r) => r.rates.map((x) => x.rateComments))]
        .map((c) => String(c ?? '').trim())
        .filter(Boolean)
        .filter((c, i, a) => a.indexOf(c) === i)
        .join('\n') || null,
  });

  const fresh = await loadRequest(id);
  const sent = await emailVoucherFor(fresh);
  back(
    id,
    `Confirmed with Hotelbeds — reference ${booking.reference}, status ${booking.status}, net ${money(cost.amount, cost.currency)}.` +
      (sent.ok ? ` Voucher emailed to ${row.email}.` : ` Voucher NOT emailed: ${sent.error ?? 'unknown error'} — use "Email voucher" to retry.`),
  );
}

async function emailVoucherFor(row: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const pdf = await renderVoucher(row);
    if (!pdf) return { ok: false, error: 'nothing confirmed to print' };
    const brand = emailBrand('staycations');
    const staff = process.env.ENQUIRY_NOTIFY_EMAIL;
    const res = await sendEmail({
      to: [row.email, staff].filter(Boolean).join(', '),
      subject: `Your hotel voucher — ${row.hotel_name} (${row.supplier_reference})`,
      html: emailShell({
        brand,
        eyebrow: 'Booking confirmed',
        title: `${row.hotel_name} is booked`,
        bodyHtml:
          `<p>Dear ${String(row.holder_name || row.name).replace(/</g, '&lt;')},</p>` +
          `<p>Your stay at <strong>${String(row.hotel_name).replace(/</g, '&lt;')}</strong> from ${row.check_in} for ${row.nights} night${row.nights === 1 ? '' : 's'} is confirmed. ` +
          `Your voucher is attached — please show it at check-in. The booking reference is <strong>${row.supplier_reference}</strong>.</p>` +
          (row.rate_comments ? `<p><strong>Please note:</strong> ${String(row.rate_comments).replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>` : '') +
          `<p>Anything at all before you travel, call us on +971 4 420 6965.</p>`,
      }),
      attachments: [{ filename: voucherFilename(row), content: pdf }],
    });
    if (res.ok && !res.skipped) {
      await saveRequest(row.id, { voucher_sent_at: new Date().toISOString() });
    }
    return res.ok ? (res.skipped ? { ok: false, error: 'email is not configured (RESEND_API_KEY)' } : { ok: true }) : { ok: false, error: res.error };
  } catch (e: any) {
    console.error('[voucher email]', e?.message ?? e);
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/** Re-send the voucher (after a correction, or because the customer lost it). */
export async function emailVoucher(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const row = await loadRequest(id);
  if (!row) return;
  if (!row.supplier_reference) back(id, 'Nothing is confirmed yet, so there is no voucher to send.');
  const sent = await emailVoucherFor(row);
  back(id, sent.ok ? `Voucher emailed to ${row.email}.` : `Voucher not sent: ${sent.error}`);
}

/** Cancel with Hotelbeds. Real in the live environment; charges may apply. */
export async function cancelSupplierBooking(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const row = await loadRequest(id);
  if (!row) return;
  if (!row.supplier_reference) back(id, 'Nothing is confirmed with Hotelbeds for this request.');
  if (row.supplier_cancelled_at) back(id, 'Already cancelled with Hotelbeds.');
  if (String(formData.get('confirm')) !== 'yes') back(id, 'Tick the box to confirm the cancellation.');

  let result: SupplierBooking;
  try {
    result = await hotelbedsCancel(row.supplier_reference);
  } catch (e: any) {
    console.error('[hotelbeds cancel]', e?.message ?? e);
    back(id, describeError(e));
  }
  const charge = await convertMoney(result.totalNet, result.currency || 'EUR');
  await saveRequest(id, {
    status: 'closed',
    supplier_status: result.status,
    supplier_cancelled_at: new Date().toISOString(),
    cancellation_cost: charge.amount,
    supplier_booking: { ...row.supplier_booking, cancellation: result },
  });
  back(
    id,
    `Cancelled with Hotelbeds — status ${result.status}. Cancellation charge reported by the supplier: ${money(charge.amount, charge.currency)}. Tell the customer.`,
  );
}
