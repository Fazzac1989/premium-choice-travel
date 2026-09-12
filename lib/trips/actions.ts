'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAccount } from '@/lib/account';
import { emailShell, sendEmail } from '@/lib/email-core';
import { emailBrand } from '@/lib/email-brand-core';
import { cancellationStanding, ownedBooking } from '@/lib/trips/portal';

/**
 * What a customer can do to their own booking from the portal.
 *
 * They can ask. Nothing here touches the supplier, moves money, or changes a
 * confirmed booking: a cancellation posted from a customer's click would
 * commit real charges against terms they may not have read, and an amendment
 * is usually a different rate that has to be re-priced. Each of these writes
 * a row a specialist picks up, and emails the team so it is not missed.
 */

export type TripActionResult = { ok: boolean; message: string };

const KINDS = { amend: 'Change request', cancel: 'Cancellation request', question: 'Question' } as const;
type Kind = keyof typeof KINDS;

export async function sendTripRequest(formData: FormData): Promise<TripActionResult> {
  const account = await getAccount();
  if (!account) return { ok: false, message: 'Please sign in again — your session has expired.' };

  const kind = String(formData.get('kind') ?? '') as Kind;
  if (!KINDS[kind]) return { ok: false, message: 'Something went wrong — please call us.' };

  const message = String(formData.get('message') ?? '').trim().slice(0, 2000);
  if (message.length < 5) {
    return {
      ok: false,
      message:
        kind === 'cancel'
          ? 'Tell us briefly why you are cancelling, so your specialist can act on it.'
          : 'Add a line or two so we know what you need.',
    };
  }

  const id = Number(formData.get('booking_id'));
  const booking = await ownedBooking(id, account);
  if (!booking) return { ok: false, message: 'We could not find that booking on your account.' };
  if (booking.supplier_cancelled_at) return { ok: false, message: 'That stay is already cancelled.' };

  const standing = cancellationStanding(booking);
  const db = createAdminClient();
  const { error } = await db.from('booking_change_requests').insert({
    booking_request_id: booking.id,
    customer_id: account.id,
    email: account.email,
    kind,
    message,
    terms_at_request: standing.text,
  });
  if (error) {
    console.error('[trip request]', error.message);
    return {
      ok: false,
      message: /relation|does not exist|schema cache/i.test(error.message)
        ? 'We could not save that just now. Please call us on +971 4 420 6965.'
        : 'We could not save that just now. Please try again, or call us on +971 4 420 6965.',
    };
  }

  await notifyTeam(booking, kind, message, standing.text, account.email);
  revalidatePath('/trips');
  revalidatePath('/sites/staycations/trips');

  return {
    ok: true,
    message:
      kind === 'cancel'
        ? 'Sent. A specialist will confirm what cancelling costs before anything is done — nothing has been cancelled yet.'
        : 'Sent. A specialist will come back to you, usually the same working day.',
  };
}

async function notifyTeam(booking: any, kind: Kind, message: string, terms: string, from: string) {
  const to = process.env.ENQUIRY_NOTIFY_EMAIL;
  if (!to) return;
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const reference = booking.supplier_reference || `PCS-${booking.id}`;
  try {
    await sendEmail({
      to,
      replyTo: from,
      subject: `${KINDS[kind]} — ${booking.hotel_name} (${reference})`,
      html: emailShell({
        brand: emailBrand('staycations'),
        eyebrow: KINDS[kind],
        title: `${booking.hotel_name}`,
        bodyHtml:
          `<p><strong>${esc(from)}</strong> asked about booking <strong>${esc(reference)}</strong>.</p>` +
          `<p>${esc(booking.check_in)} for ${booking.nights} night${booking.nights === 1 ? '' : 's'}${booking.room_name ? `, ${esc(booking.room_name)}` : ''}.</p>` +
          `<p><strong>They wrote:</strong><br>${esc(message).replace(/\n/g, '<br>')}</p>` +
          `<p><strong>Cancellation standing when they asked:</strong> ${esc(terms)}</p>` +
          (kind === 'cancel'
            ? `<p><strong>Nothing has been cancelled with the supplier.</strong> Do it from the admin when you have agreed the charge with them.</p>`
            : ''),
        cta: {
          label: 'Open the request',
          url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://premiumchoicetravel.com'}/admin/requests/${booking.id}`,
        },
      }),
    });
  } catch (e: any) {
    // The row is saved either way; a failed email must not lose the request.
    console.error('[trip request email]', e?.message ?? e);
  }
}
