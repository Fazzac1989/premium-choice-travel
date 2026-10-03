'use server';

import { headers } from 'next/headers';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getAccount } from '@/lib/account';
import { getTravellers, leadTraveller } from '@/lib/travellers';
import { ratesVisible } from '@/lib/rates';
import { boardName, getQuote, PlatformError, quoteOffer, startCheckout, type PlatformQuote } from '@/lib/platform/client';

/**
 * Book a stay: the room's price was locked on the platform when "Book this room" was pressed (a
 * quote); this opens the payment page for it and comes back to /trips/confirm, where the booking
 * is confirmed once the card is held (founder, 2026-10-02: "bookings confirm instantly"). The card
 * is only held, not charged, until the hotel is booked; if it cannot be booked the hold is
 * released. Nothing here trusts a price or a room from the browser: both come from the quote.
 */
export type StartBookingResult = { ok: boolean; message: string; payUrl?: string };

const splitName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop()! : parts[0] ?? '';
  return { first: parts.join(' ') || last, last };
};

/** The address the customer came in on, so the payment page brings them back to this brand. */
function originOf(): string {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://premiumchoicestaycations.com';
  const proto = h.get('x-forwarded-proto') ?? (/^(localhost|127\.)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** A quote still usable now: an expired one is priced again, and a changed price is told, not taken. */
async function liveQuote(quoteId: string): Promise<{ quote: PlatformQuote } | { message: string }> {
  let quote: PlatformQuote;
  try {
    quote = await getQuote(quoteId);
  } catch {
    return { message: 'We could not find that price any more. Choose the room again.' };
  }
  if (quote.status === 'consumed') return { message: 'This room has already been booked. See it under My trips.' };
  if (quote.status === 'active' && Date.parse(quote.expiresAt) > Date.now() + 30_000) return { quote };
  try {
    const fresh = await quoteOffer(quote.offerId);
    if (Math.abs(fresh.price.total.amount - quote.price.total.amount) >= 100)
      return {
        message: `The price for this room has changed to ${fresh.price.total.currency} ${(fresh.price.total.amount / 100).toLocaleString('en-GB')}. Choose the room again to see it.`,
      };
    return { quote: fresh };
  } catch (e) {
    const gone = e instanceof PlatformError && (e.status === 404 || e.status === 409 || e.status === 410);
    return {
      message: gone
        ? 'That room has just gone or its price has changed. Choose the room again to see what is available now.'
        : 'We could not reach our booking system just now. Please try again in a moment.',
    };
  }
}

export async function startStayBooking(payload: {
  quoteId: string;
  phone: string;
  notes: string;
  travellerIds?: number[];
  acceptedTerms?: boolean;
  marketingOptIn?: boolean;
  /** the checkout page to go back to if they leave the payment page */
  backPath: string;
  /** where this brand's pages live: '' on its own domain, '/sites/staycations' on the master */
  base: string;
}): Promise<StartBookingResult> {
  const account = await getAccount();
  if (!account) return { ok: false, message: 'Please sign in again — your session has expired. Your room is still here.' };
  if (!ratesVisible(true)) return { ok: false, message: 'Booking is not available right now. Please call us on +971 4 420 6965.' };
  if (!payload.acceptedTerms)
    return { ok: false, message: 'Please accept the booking terms and privacy notice to continue.' };
  if (!isSupabaseConfigured()) return { ok: false, message: 'Booking is not available right now. Please call us.' };
  if (!/^[0-9a-f-]{36}$/i.test(payload.quoteId)) return { ok: false, message: 'Choose the room again.' };

  const live = await liveQuote(payload.quoteId);
  if ('message' in live) return { ok: false, message: live.message };
  const quote = live.quote;

  // The guests' names, as their passports have them: chosen from the saved travellers on this
  // account (never trusted from the browser); anyone not chosen travels under the lead's name.
  const saved = await getTravellers(account.id);
  const chosen = saved.filter((t) => payload.travellerIds?.includes(t.id) && t.fullName);
  const lead = chosen[0] ?? leadTraveller(saved);
  const leadName = splitName(lead?.fullName || account.fullName || '');
  if (!leadName.last) return { ok: false, message: 'Add the name your booking should be in — your passport name.' };
  const party: ('adult' | 'child')[] = [
    ...Array.from({ length: quote.adults }, () => 'adult' as const),
    ...quote.childAges.map(() => 'child' as const),
  ];
  const travellers = party.map((type, i) => {
    const t = chosen[i];
    const n = t ? splitName(t.fullName) : i === 0 ? leadName : { first: 'Guest', last: leadName.last };
    return { firstName: n.first, lastName: n.last, type };
  });

  const db = createAdminClient();
  // one of our curated hotels keeps its link; any other is known by name on the trip
  const { data: curated } = await db.from('hotels').select('id, emirate').eq('supplier_code', quote.hotel.id).maybeSingle();
  const total = quote.price.total.amount / 100;
  const now = new Date().toISOString();
  const { data: row, error } = await db
    .from('booking_requests')
    .insert({
      hotel_id: curated?.id ?? null,
      hotel_name: quote.hotel.name,
      emirate: curated?.emirate ?? quote.hotel.city,
      check_in: quote.checkIn,
      nights: quote.nights,
      adults: quote.adults,
      children: quote.childAges.length,
      room_name: quote.roomName,
      board: boardName(quote.board),
      refundable: quote.refundable,
      cancel_by: quote.refundDeadline,
      currency: quote.price.total.currency,
      amount: total,
      offer_id: quote.offerId,
      provider: 'platform',
      name: `${leadName.first} ${leadName.last}`.trim(),
      email: account.email,
      phone: payload.phone.trim() || account.phone || null,
      notes: payload.notes.trim() || null,
      status: 'new',
      traveller_ids: chosen.map((t) => t.id),
      customer_id: account.id,
      children_ages: quote.childAges.length ? quote.childAges : null,
      terms_accepted_at: now,
      marketing_opt_in: Boolean(payload.marketingOptIn),
      marketing_opt_in_at: payload.marketingOptIn ? now : null,
    })
    .select('id')
    .single();
  if (error || !row) {
    console.error('[book]', error?.message);
    return { ok: false, message: 'We could not start your booking. Please try again or call us.' };
  }

  const origin = originOf();
  const phone = (payload.phone.trim() || account.phone || '').slice(0, 32);
  let checkout;
  try {
    checkout = await startCheckout({
      quoteId: quote.id,
      customer: {
        email: account.email,
        firstName: leadName.first,
        lastName: leadName.last,
        ...(phone ? { phone } : {}),
        externalId: account.id,
      },
      travellers,
      ...(payload.notes.trim() ? { requests: payload.notes.trim().slice(0, 1000) } : {}),
      returnUrl: `${origin}${payload.base}/trips/confirm?b=${row.id}`,
      cancelUrl: `${origin}${payload.backPath}`,
    });
  } catch (e) {
    await db.from('booking_requests').update({ status: 'closed' }).eq('id', row.id);
    return {
      ok: false,
      message:
        e instanceof PlatformError && e.status < 500
          ? `${e.message}${e.next ? ` ${e.next}` : ''}`
          : 'We could not open the payment page. Please try again in a moment.',
    };
  }
  await db.from('booking_requests').update({ platform_checkout_id: checkout.id }).eq('id', row.id);
  if (!checkout.paymentUrl) return { ok: false, message: 'We could not open the payment page. Please try again.' };
  return { ok: true, message: 'Taking you to the secure payment page…', payUrl: checkout.paymentUrl };
}
