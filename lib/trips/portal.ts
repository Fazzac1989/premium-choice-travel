import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAccount, type Account } from '@/lib/account';
import { listLinksForBooking } from '@/lib/payments/links-core';
import { paymentsConfigured } from '@/lib/payments/gateway';

/**
 * A customer's own view of one booking.
 *
 * Every read here goes through `ownedBooking`, which is the only thing
 * standing between someone's voucher and a guessed id in the address bar.
 * It matches on the account id and on the verified email address, because a
 * request sent before they had an account is still theirs.
 */

export type ChangeRequest = {
  id: number;
  createdAt: string;
  kind: 'amend' | 'cancel' | 'question';
  message: string;
  status: string;
  staffNote: string;
  handledAt: string;
};

/** The booking, if it belongs to the person asking. Null for anything else. */
export async function ownedBooking(id: number, account?: Account | null) {
  const who = account ?? (await getAccount());
  if (!who || !Number.isFinite(id)) return null;
  const db = createAdminClient();
  const { data } = await db.from('booking_requests').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const mine =
    (data.customer_id && data.customer_id === who.id) ||
    (data.email && who.email && String(data.email).toLowerCase() === who.email.toLowerCase());
  return mine ? data : null;
}

/** The change requests already sent for one booking, newest first. */
export async function changeRequestsFor(bookingIds: number[]): Promise<Map<number, ChangeRequest[]>> {
  const out = new Map<number, ChangeRequest[]>();
  if (!bookingIds.length) return out;
  const db = createAdminClient();
  const { data, error } = await db
    .from('booking_change_requests')
    .select('*')
    .in('booking_request_id', bookingIds)
    .order('created_at', { ascending: false });
  // The table arrives with migration 023; before that the portal simply has
  // no history to show, which is true rather than broken.
  if (error) return out;
  for (const row of data ?? []) {
    const list = out.get(row.booking_request_id) ?? [];
    list.push({
      id: row.id,
      createdAt: row.created_at,
      kind: row.kind,
      message: row.message,
      status: row.status,
      staffNote: row.staff_note ?? '',
      handledAt: row.handled_at ?? '',
    });
    out.set(row.booking_request_id, list);
  }
  return out;
}

export type TripPayment = {
  /** A link the customer can still pay on, if there is one. */
  payUrl: string;
  amount: number;
  currency: string;
  expiresAt: string;
  paid: boolean;
  /** Why there is nothing to pay here, in words a customer can act on. */
  note: string;
};

/**
 * What to tell someone about paying for this stay.
 *
 * There is no payment gateway on this deployment at the moment, so the honest
 * answer is nearly always "your specialist will arrange it". When a gateway
 * exists and a link has been made, this hands back the link.
 */
export async function tripPayment(booking: any): Promise<TripPayment> {
  const base: TripPayment = { payUrl: '', amount: 0, currency: 'AED', expiresAt: '', paid: false, note: '' };
  if (booking.paid_at) return { ...base, paid: true, note: 'Paid in full. Thank you.' };

  const db = createAdminClient();
  const links = await listLinksForBooking(db, booking.id);
  const live = links.find((l) => l.status !== 'paid' && (!l.expiresAt || new Date(l.expiresAt) > new Date()));
  if (live) {
    return { ...base, payUrl: live.url, amount: live.amount, currency: live.currency, expiresAt: live.expiresAt, note: '' };
  }
  if (links.some((l) => l.status === 'paid')) return { ...base, paid: true, note: 'Paid in full. Thank you.' };
  if (links.length) {
    return { ...base, note: 'Your payment link has expired. Ask us below and we will send a new one.' };
  }
  return {
    ...base,
    note: paymentsConfigured()
      ? 'Nothing to pay here yet. Your specialist sends a link once the stay is confirmed with the hotel.'
      : 'Payment is arranged with your specialist. Nothing is charged through the app.',
  };
}

/** Whether a confirmed booking still has free cancellation, and until when. */
export function cancellationStanding(booking: any) {
  if (booking.refundable === false) {
    return { free: false, deadline: '', text: 'This rate is non-refundable. Cancelling it may cost the full amount.' };
  }
  const by = booking.cancel_by ? String(booking.cancel_by) : '';
  if (!by) {
    return { free: false, deadline: '', text: 'Your specialist will tell you what cancelling this stay costs before anything is done.' };
  }
  const free = new Date(by) > new Date();
  return {
    free,
    deadline: by.slice(0, 10),
    text: free
      ? `Free cancellation until ${by.slice(0, 10)}. After that the hotel's charge applies.`
      : `The free cancellation deadline (${by.slice(0, 10)}) has passed, so the hotel's charge applies.`,
  };
}
