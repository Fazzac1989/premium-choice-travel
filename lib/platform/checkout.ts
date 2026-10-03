'use server';

import { headers } from 'next/headers';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getAccount } from '@/lib/account';
import { getTravellers, leadTraveller } from '@/lib/travellers';
import { cleanAges, findCachedOffer, ratesVisible } from '@/lib/rates';
import { PlatformError, quoteOffer, startCheckout } from '@/lib/platform/client';

/**
 * Book a stay: lock today's price on the platform, open the payment page, and come back to
 * /trips/confirm, where the booking is confirmed once the card is held (founder, 2026-10-02:
 * "bookings confirm instantly"). The card is only held, not charged, until the hotel is booked;
 * if it cannot be booked the hold is released. Nothing here trusts a price from the browser:
 * the offer is re-read from our cache, and the platform prices it again.
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

export async function startStayBooking(payload: {
  hotelId: number;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
  childrenAges?: number[];
  offerId: string;
  phone: string;
  notes: string;
  travellerIds?: number[];
  acceptedTerms?: boolean;
  marketingOptIn?: boolean;
  /** the stay page to go back to if they leave the payment page */
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

  const nights = Math.max(1, Math.min(30, Number(payload.nights) || 1));
  const adults = Math.max(1, Math.min(12, Number(payload.adults) || 2));
  const children = Math.max(0, Math.min(8, Number(payload.children) || 0));
  const ages = cleanAges(payload.childrenAges, children);

  const db = createAdminClient();
  const { data: hotel } = await db.from('hotels').select('id, name, emirate').eq('id', payload.hotelId).maybeSingle();
  if (!hotel) return { ok: false, message: 'We could not find that hotel. Please search again.' };

  const offer = await findCachedOffer({
    hotelId: payload.hotelId,
    checkIn: payload.checkIn,
    nights,
    adults,
    children,
    offerId: payload.offerId,
  });
  if (!offer)
    return { ok: false, message: 'That price has expired — check the dates again and we’ll show you what’s available now.' };

  // The guests' names, as their passports have them: chosen from the saved travellers on this
  // account (never trusted from the browser); anyone not chosen travels under the lead's name.
  const saved = await getTravellers(account.id);
  const chosen = saved.filter((t) => payload.travellerIds?.includes(t.id) && t.fullName);
  const lead = chosen[0] ?? leadTraveller(saved);
  const leadName = splitName(lead?.fullName || account.fullName || '');
  if (!leadName.last) return { ok: false, message: 'Add the name your booking should be in — your passport name.' };
  const party: ('adult' | 'child')[] = [
    ...Array.from({ length: adults }, () => 'adult' as const),
    ...Array.from({ length: children }, () => 'child' as const),
  ];
  const travellers = party.map((type, i) => {
    const t = chosen[i];
    const n = t ? splitName(t.fullName) : i === 0 ? leadName : { first: 'Guest', last: leadName.last };
    return { firstName: n.first, lastName: n.last, type };
  });

  // Today's price on the platform; a different figure is told, never charged quietly.
  let quote;
  try {
    quote = await quoteOffer(offer.offerId);
  } catch (e) {
    const gone = e instanceof PlatformError && (e.status === 404 || e.status === 409 || e.status === 410);
    return {
      ok: false,
      message: gone
        ? 'That room has just gone or its price has changed. Check the dates again to see what is available now.'
        : 'We could not reach our booking system just now. Please try again in a moment.',
    };
  }
  const total = quote.price.total.amount / 100;
  if (Math.abs(total - offer.total) >= 1)
    return {
      ok: false,
      message: `The price for this room has changed to ${quote.price.total.currency} ${total.toLocaleString('en-GB')}. Check the dates again to see it.`,
    };

  const now = new Date().toISOString();
  const { data: row, error } = await db
    .from('booking_requests')
    .insert({
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      emirate: hotel.emirate,
      check_in: payload.checkIn,
      nights,
      adults,
      children,
      room_name: offer.roomName,
      board: offer.board,
      refundable: offer.refundable,
      cancel_by: offer.cancelBy,
      currency: quote.price.total.currency,
      amount: total,
      offer_id: offer.offerId,
      provider: 'platform',
      name: `${leadName.first} ${leadName.last}`.trim(),
      email: account.email,
      phone: payload.phone.trim() || account.phone || null,
      notes: payload.notes.trim() || null,
      status: 'new',
      traveller_ids: chosen.map((t) => t.id),
      customer_id: account.id,
      children_ages: ages.length ? ages : null,
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
  let checkout;
  try {
    checkout = await startCheckout({
      quoteId: quote.id,
      customer: {
        email: account.email,
        firstName: leadName.first,
        lastName: leadName.last,
        ...(payload.phone.trim() || account.phone ? { phone: (payload.phone.trim() || account.phone).slice(0, 32) } : {}),
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
