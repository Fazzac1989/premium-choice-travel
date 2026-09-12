'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRequestsStaff } from '@/lib/admin/guard';
import { emailShell, sendEmail } from '@/lib/email-core';
import { emailBrand } from '@/lib/email-brand-core';

/**
 * Answering what a customer asked from their portal.
 *
 * Marking one dealt with is not the same as doing it: cancelling with the
 * supplier is still the Hotelbeds panel above, and re-pricing an amendment is
 * still a quote. This only closes the message and, when a note is written,
 * sends it to the customer so the answer reaches them rather than sitting in
 * a database.
 */

export type ChangeRequestRow = {
  id: number;
  createdAt: string;
  kind: string;
  message: string;
  status: string;
  staffNote: string;
  email: string;
  termsAtRequest: string;
  handledAt: string;
  handledBy: string;
};

/** Open and answered requests for one booking, newest first. */
export async function listChangeRequests(db: any, bookingRequestId: number): Promise<ChangeRequestRow[]> {
  const { data, error } = await db
    .from('booking_change_requests')
    .select('*')
    .eq('booking_request_id', bookingRequestId)
    .order('created_at', { ascending: false });
  // Migration 023 not in yet: no queue to show, rather than a broken page.
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    createdAt: r.created_at,
    kind: r.kind,
    message: r.message,
    status: r.status,
    staffNote: r.staff_note ?? '',
    email: r.email ?? '',
    termsAtRequest: r.terms_at_request ?? '',
    handledAt: r.handled_at ?? '',
    handledBy: r.handled_by ?? '',
  }));
}

export async function answerChangeRequest(formData: FormData) {
  const staff = await requireRequestsStaff();
  const id = Number(formData.get('change_id'));
  const bookingId = Number(formData.get('id'));
  const note = String(formData.get('staff_note') ?? '').trim().slice(0, 2000);
  const status = String(formData.get('status') ?? 'done');

  const back = (text: string): never => {
    revalidatePath(`/admin/requests/${bookingId}`);
    redirect(`/admin/requests/${bookingId}?note=${encodeURIComponent(text)}`);
  };

  if (!Number.isFinite(id)) back('Nothing to answer.');

  const db = createAdminClient();
  const { data: row } = await db.from('booking_change_requests').select('*').eq('id', id).maybeSingle();
  if (!row) back('That message is no longer there.');

  const { error } = await db
    .from('booking_change_requests')
    .update({
      status,
      staff_note: note || row.staff_note,
      handled_at: new Date().toISOString(),
      handled_by: staff.email,
    })
    .eq('id', id);
  if (error) back(`Could not update it: ${error.message}`);

  if (!note) back('Marked as dealt with. Nothing was emailed — the customer sees the status in their trips.');

  const { data: booking } = await db.from('booking_requests').select('*').eq('id', bookingId).maybeSingle();
  const to = row.email || booking?.email;
  if (!to) back('Saved, but there is no email address to reply to.');

  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const res = await sendEmail({
    to,
    subject: `About your stay at ${booking?.hotel_name ?? 'your hotel'}`,
    html: emailShell({
      brand: emailBrand('staycations'),
      eyebrow: 'Your booking',
      title: booking?.hotel_name ?? 'Your stay',
      bodyHtml:
        `<p>Dear ${esc(booking?.holder_name || booking?.name || 'guest')},</p>` +
        `<p>About what you asked us:</p>` +
        `<blockquote style="margin:0 0 16px;padding-left:14px;border-left:3px solid #dae4e5;color:#596d74">${esc(row.message).replace(/\n/g, '<br>')}</blockquote>` +
        `<p>${esc(note).replace(/\n/g, '<br>')}</p>` +
        `<p>Anything else at all, call us on +971 4 420 6965.</p>`,
    }),
  });

  back(res.ok && !res.skipped ? `Answered and emailed to ${to}.` : `Saved, but the reply was not emailed (${res.error ?? 'email is not configured'}).`);
}
