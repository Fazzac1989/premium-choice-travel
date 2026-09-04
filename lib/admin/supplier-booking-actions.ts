'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';
import { activeProvider, getOffers } from '@/lib/rates';
import {
  bookingBlocker,
  cancelRequest,
  confirmRequest,
  describeSupplierError,
  emailVoucherFor,
  loadRequest,
  money,
  recheckRequest,
  saveRequest,
} from '@/lib/rates/supplier-booking';
import type { SupplierPax } from '@/lib/rates/hotelbeds';
import type { RoomOffer } from '@/lib/rates/types';

/**
 * The specialist's half of a Hotelbeds booking, as server actions behind the
 * request page. Each one checks the admin session, hands the work to
 * lib/rates/supplier-booking.ts (shared with the integration test), and
 * comes back to the page with a note saying what happened.
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

async function guarded(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const db = createAdminClient();
  const row = id ? await loadRequest(db, id) : null;
  return { id, db, row };
}

function sameRoom(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().replace(/\(pay at the hotel\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return norm(a) === norm(b);
}

/**
 * Search again for the room the customer chose and move the request onto the
 * current rate key and price. Used when hours have passed and the original
 * key has expired, or when the specialist wants today's price.
 */
export async function refreshSupplierOffer(formData: FormData) {
  const { id, db, row } = await guarded(formData);
  if (!row) return;
  const blocked = bookingBlocker(row, activeProvider()?.name ?? null);
  if (blocked) back(id, blocked);
  if (row.supplier_reference) back(id, 'Already confirmed with Hotelbeds — nothing to refresh.');

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
    back(id, describeSupplierError(e));
  }
  if (!offers.length) back(id, 'Hotelbeds returned nothing for these dates now. Price it by hand or ask the customer for other dates.');

  const exact = offers.find((o) => sameRoom(o.roomName, row.room_name ?? '') && o.board === row.board && o.refundable === row.refundable);
  const match = exact ?? offers.find((o) => sameRoom(o.roomName, row.room_name ?? '') && o.board === row.board) ?? offers.find((o) => sameRoom(o.roomName, row.room_name ?? ''));
  if (!match) back(id, `That room is no longer offered for these dates. Cheapest now: ${offers[0].roomName} · ${offers[0].board} at ${money(offers[0].total, offers[0].currency)}.`);

  const before = Number(row.amount);
  const fees = match.extraFees.map((f) => `${f.currency} ${f.amount} ${f.description}`).join(', ');
  await saveRequest(db, id, {
    offer_id: match.offerId,
    room_name: match.roomName,
    board: match.board,
    refundable: match.refundable,
    cancel_by: match.cancelBy,
    currency: match.currency,
    amount: match.total,
    net_amount: match.net,
    extra_fees: fees || null,
    rate_comments: match.comments ?? null,
    supplier_recheck: {
      at: new Date().toISOString(),
      total: match.total,
      net: match.net,
      currency: match.currency,
      rateType: match.rateType ?? 'BOOKABLE',
      comments: match.comments ?? '',
      source: 'availability',
    },
  });
  const moved = Math.abs(match.total - before) >= 1;
  back(
    id,
    `Rate refreshed${exact ? '' : ' (closest match)'}: ${match.roomName} · ${match.board} at ${money(match.total, match.currency)}` +
      (moved ? ` — was ${money(before, row.currency)}. Tell the customer before confirming.` : ' — unchanged.'),
  );
}

/** Ask Hotelbeds to re-price the exact rate key before confirming. Required for RECHECK rates. */
export async function recheckSupplierRate(formData: FormData) {
  const { id, db, row } = await guarded(formData);
  if (!row) return;
  const blocked = bookingBlocker(row, activeProvider()?.name ?? null);
  if (blocked) back(id, blocked);
  if (row.supplier_reference) back(id, 'Already confirmed with Hotelbeds.');
  const out = await recheckRequest(db, row);
  back(id, out.note);
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
  const { id, db, row } = await guarded(formData);
  if (!row) return;
  const blocked = bookingBlocker(row, activeProvider()?.name ?? null);
  if (blocked) back(id, blocked);
  if (String(formData.get('agreed')) !== 'yes') back(id, 'Tick the box to say the customer has agreed the price and terms.');

  const holder = {
    name: String(formData.get('holder_name') ?? '').trim(),
    surname: String(formData.get('holder_surname') ?? '').trim(),
  };
  const out = await confirmRequest(db, row, {
    holder,
    paxes: paxesFrom(formData, row, holder),
    remark: String(formData.get('remark') ?? '').trim(),
  });
  back(id, out.note);
}

/** Re-send the voucher (after a correction, or because the customer lost it). */
export async function emailVoucher(formData: FormData) {
  const { id, db, row } = await guarded(formData);
  if (!row) return;
  if (!row.supplier_reference) back(id, 'Nothing is confirmed yet, so there is no voucher to send.');
  const sent = await emailVoucherFor(db, row);
  back(id, sent.ok ? `Voucher emailed to ${row.email}.` : `Voucher not sent: ${sent.error}`);
}

/** Cancel with Hotelbeds. Real in the live environment; charges may apply. */
export async function cancelSupplierBooking(formData: FormData) {
  const { id, db, row } = await guarded(formData);
  if (!row) return;
  if (String(formData.get('confirm')) !== 'yes') back(id, 'Tick the box to confirm the cancellation.');
  const out = await cancelRequest(db, row);
  back(id, out.note);
}
