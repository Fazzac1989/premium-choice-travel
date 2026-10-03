'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRequestsStaff } from '@/lib/admin/guard';
import { emailVoucherFor, loadRequest, money } from '@/lib/trips/legacy-voucher';
import { createLinkForBooking, emailPaymentRequest, listLinksForBooking, verifyLink } from '@/lib/payments/links-core';
import { NO_GATEWAY, paymentsConfigured } from '@/lib/payments/gateway';

/**
 * What a specialist can still do on a request booked before the platform: take the money by
 * payment link and send the voucher. A stay booked through the platform is cancelled, refunded
 * and amended on the trade console, never here (founder, 2026-10-02).
 */

function back(id: number, note: string): never {
  revalidatePath('/admin/requests');
  revalidatePath(`/admin/requests/${id}`);
  redirect(`/admin/requests/${id}?note=${encodeURIComponent(note)}`);
}

async function guarded(formData: FormData) {
  const staff = await requireRequestsStaff();
  const id = Number(formData.get('id'));
  const db = createAdminClient();
  const row = id ? await loadRequest(db, id) : null;
  return { id, db, row, staff };
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://premiumchoicetravel.com';
}

/** Create a fresh link — the first one expired, or none was made at booking. */
export async function createBookingPaymentLink(formData: FormData) {
  const { id, db, row, staff } = await guarded(formData);
  if (!row) return;
  if (row.provider === 'platform') back(id, 'This stay was paid for when it was booked.');
  if (!paymentsConfigured()) back(id, NO_GATEWAY);
  if (row.paid_at) back(id, 'This booking is already paid.');

  const link = await createLinkForBooking(db, {
    request: row,
    createdBy: staff.email,
    siteUrl: siteUrl(),
    validityMinutes: Number(formData.get('link_hours')) * 60 || 72 * 60,
  });
  if (!link.ok) back(id, link.error);
  const mail = await emailPaymentRequest(row, link.link);
  back(
    id,
    `Payment link for ${money(link.link.amount, link.link.currency)} created` +
      (mail.ok ? ` and emailed to ${row.email}.` : ` but NOT emailed (${mail.error}) — copy it from below.`),
  );
}

/** Send the customer the link again, unchanged. */
export async function resendPaymentLink(formData: FormData) {
  const { id, db, row } = await guarded(formData);
  if (!row) return;
  const links = await listLinksForBooking(db, id);
  const link = links.find((l) => String(l.id) === String(formData.get('link_id'))) ?? links[0];
  if (!link) back(id, 'There is no payment link on this request yet.');
  const mail = await emailPaymentRequest(row, link);
  back(id, mail.ok ? `Payment link emailed to ${row.email} again.` : `Not emailed: ${mail.error}`);
}

/** Ask the gateway whether it has been paid, and send the voucher if it has. */
export async function checkBookingPayment(formData: FormData) {
  const { id, db } = await guarded(formData);
  const linkId = Number(formData.get('link_id'));
  if (!Number.isFinite(linkId)) back(id, 'Nothing to check.');
  const result = await verifyLink(db, linkId);
  back(id, result.detail);
}

/** Re-send the voucher (after a correction, or because the customer lost it). */
export async function emailVoucher(formData: FormData) {
  const { id, db, row } = await guarded(formData);
  if (!row) return;
  if (row.provider === 'platform') back(id, 'The platform emailed this voucher; resend it from the trade console.');
  if (!row.supplier_reference) back(id, 'Nothing is confirmed yet, so there is no voucher to send.');
  const sent = await emailVoucherFor(db, row);
  back(id, sent.ok ? `Voucher emailed to ${row.email}.` : `Voucher not sent: ${sent.error}`);
}
