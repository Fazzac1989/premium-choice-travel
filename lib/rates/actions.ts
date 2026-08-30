'use server';

import { findCachedOffer, getOffers, getRate } from '@/lib/rates';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { toPublicOffer, type DisplayRate, type PublicRoomOffer } from '@/lib/rates/types';
import { emailShell, sendEmail } from '@/lib/email';

/**
 * Price one hotel for one set of dates, on request.
 *
 * Called from a button rather than on page load, so a supplier search only
 * happens when someone has actually asked. The supplier code is read here
 * rather than passed in, so a visitor cannot aim our credentials at an
 * arbitrary property.
 */
export async function checkRate(params: {
  hotelId: number;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
}): Promise<DisplayRate> {
  if (!isSupabaseConfigured()) return { status: 'off' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.checkIn)) return { status: 'unavailable' };

  const nights = Math.max(1, Math.min(30, Number(params.nights) || 1));
  const adults = Math.max(1, Math.min(12, Number(params.adults) || 2));
  const children = Math.max(0, Math.min(8, Number(params.children) || 0));

  const db = createAdminClient();
  const { data: hotel } = await db
    .from('hotels')
    .select('id, supplier_code, status')
    .eq('id', params.hotelId)
    .maybeSingle();

  if (!hotel || hotel.status === 'draft') return { status: 'off' };

  return getRate({
    hotelId: hotel.id,
    supplierCode: hotel.supplier_code ?? null,
    checkIn: params.checkIn,
    nights,
    adults,
    children,
  });
}

/** Room options for a hotel and dates. Cost is stripped before it leaves. */
export async function roomOffers(params: {
  hotelId: number;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
}): Promise<{ ok: boolean; offers: PublicRoomOffer[]; message?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, offers: [], message: 'Pricing is not available right now.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.checkIn)) return { ok: false, offers: [], message: 'Pick a check-in date.' };

  const nights = Math.max(1, Math.min(30, Number(params.nights) || 1));
  const adults = Math.max(1, Math.min(12, Number(params.adults) || 2));
  const children = Math.max(0, Math.min(8, Number(params.children) || 0));

  const db = createAdminClient();
  const { data: hotel } = await db
    .from('hotels')
    .select('id, supplier_code, status')
    .eq('id', params.hotelId)
    .maybeSingle();
  if (!hotel || hotel.status === 'draft' || !hotel.supplier_code) {
    return { ok: false, offers: [], message: 'We price this hotel by hand — send us your dates below.' };
  }

  const offers = await getOffers({
    hotelId: hotel.id,
    supplierCode: hotel.supplier_code,
    checkIn: params.checkIn,
    nights,
    adults,
    children,
  });

  if (!offers.length) {
    return { ok: false, offers: [], message: 'Nothing came back for those dates — send them to us and we will look properly.' };
  }
  return { ok: true, offers: offers.map(toPublicOffer) };
}

export type BookingRequestResult = { ok: boolean; message: string };

/**
 * A request to book, not a booking.
 *
 * The price is re-read from the server-side cache using the offer id, so what
 * is recorded is what we showed rather than what the browser sent. Nothing is
 * held or confirmed here — a specialist does that, and the wording the
 * customer sees says so plainly.
 */
export async function submitBookingRequest(payload: {
  hotelId: number;
  checkIn: string;
  nights: number;
  adults: number;
  children?: number;
  offerId: string;
  name: string;
  email: string;
  phone: string;
  channel: string;
  notes: string;
}): Promise<BookingRequestResult> {
  const name = payload.name.trim();
  const email = payload.email.trim();
  if (!name || !email) return { ok: false, message: 'Please add your name and email.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'That email address doesn’t look right.' };
  if (!isSupabaseConfigured()) return { ok: false, message: 'Something went wrong — please call us.' };

  const nights = Math.max(1, Math.min(30, Number(payload.nights) || 1));
  const adults = Math.max(1, Math.min(12, Number(payload.adults) || 2));
  const children = Math.max(0, Math.min(8, Number(payload.children) || 0));

  const db = createAdminClient();
  const { data: hotel } = await db
    .from('hotels')
    .select('id, name, emirate')
    .eq('id', payload.hotelId)
    .maybeSingle();
  if (!hotel) return { ok: false, message: 'Something went wrong — please call us.' };

  const offer = await findCachedOffer({
    hotelId: payload.hotelId,
    checkIn: payload.checkIn,
    nights,
    adults,
    children,
    offerId: payload.offerId,
  });
  if (!offer) {
    return {
      ok: false,
      message: 'That price has expired — check the dates again and we’ll show you what’s available now.',
    };
  }

  const fees = offer.extraFees.map((f) => `${f.currency} ${f.amount} ${f.description}`).join(', ');
  const { error } = await db.from('booking_requests').insert({
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
    currency: offer.currency,
    amount: offer.total,
    net_amount: offer.net,
    extra_fees: fees || null,
    offer_id: offer.offerId,
    provider: 'liteapi',
    name,
    email,
    phone: payload.phone.trim() || null,
    channel: payload.channel || null,
    notes: payload.notes.trim() || null,
    status: 'new',
  });
  if (error) {
    console.error('[booking-request]', error.message);
    return { ok: false, message: 'Something went wrong — please try again or call us.' };
  }

  const brief = [
    `BOOKING REQUEST — ${hotel.name}${hotel.emirate ? ` (${hotel.emirate})` : ''}`,
    '',
    `${payload.checkIn} · ${nights} night${nights === 1 ? '' : 's'} · ${adults} adult${adults === 1 ? '' : 's'}${children ? `, ${children} children` : ''}`,
    `Room: ${offer.roomName}${offer.board ? ` · ${offer.board}` : ''}`,
    `Cancellation: ${offer.refundable === true ? `refundable${offer.cancelBy ? ` until ${offer.cancelBy}` : ''}` : offer.refundable === false ? 'non-refundable' : 'not stated'}`,
    '',
    `Customer was shown: ${offer.currency} ${offer.total.toLocaleString()} total`,
    offer.net ? `Our cost at the time: ${offer.currency} ${offer.net.toLocaleString()} (margin ${offer.currency} ${Math.round(offer.total - offer.net).toLocaleString()})` : null,
    fees ? `Payable at the hotel, not included: ${fees}` : null,
    '',
    `${name} · ${email}${payload.phone.trim() ? ` · ${payload.phone.trim()}` : ''}`,
    `Reply by: ${payload.channel || 'any'}`,
    payload.notes.trim() ? `Notes: ${payload.notes.trim()}` : null,
    '',
    `Supplier offer id: ${offer.offerId}`,
    '',
    'This is a request. Nothing is held — confirm the rate with the supplier before replying.',
  ]
    .filter((l) => l !== null)
    .join('\n');

  const notifyTo = process.env.ENQUIRY_NOTIFY_EMAIL;
  if (notifyTo) {
    await sendEmail({
      to: notifyTo,
      replyTo: email,
      subject: `Booking request — ${hotel.name} · ${name}`,
      html: emailShell({
        title: 'Booking request',
        bodyHtml: `<pre style="font-size:12px;line-height:1.6;white-space:pre-wrap;font-family:inherit">${brief
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</pre>`,
      }),
    });
  }

  return {
    ok: true,
    message: 'Request received. A specialist confirms the room and the final price with the hotel and comes back to you — usually the same working day.',
  };
}
