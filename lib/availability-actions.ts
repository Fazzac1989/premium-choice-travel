'use server';

import { headers } from 'next/headers';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { describeRejection, guardSubmission, remoteIpFrom, type GuardPayload } from '@/lib/spam-guard';
import { emailShell, sendEmail } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';
import { sendCustomerConfirmation } from '@/lib/email-customer';

/**
 * Staycation availability check — a structured "price this for me" request.
 * Today it lands in the enquiries workflow for a specialist to price the same
 * day; when a bed bank is connected, this action is the single place the live
 * availability call plugs into.
 */
export type AvailabilityResult = { ok: boolean; message: string };

const THANKS = 'Got it — a specialist is checking availability and will reply with priced options, typically the same working day. We have emailed you a copy.';

export async function submitAvailabilityCheck(payload: {
  hotelName: string;
  emirate: string;
  checkIn: string;
  nights: number;
  adults: number;
  childrenAges: string;
  mealPlan: string;
  name: string;
  email: string;
  phone: string;
  channel: string;
  notes: string;
  guard?: GuardPayload;
}): Promise<AvailabilityResult> {
  const name = payload.name.trim();
  const email = payload.email.trim();
  if (!name || !email) return { ok: false, message: 'Please add your name and email.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'That email address doesn’t look right.' };

  // Bots first, before anything is stored or sent. A silent rejection is
  // answered with the ordinary thank-you, so the bot learns nothing.
  const verdict = await guardSubmission({
    ...(payload.guard ?? {}),
    fields: [name, payload.childrenAges, payload.notes, payload.phone],
    remoteIp: remoteIpFrom(headers().get('x-forwarded-for')),
  });
  if (!verdict.ok) {
    console.warn(describeRejection(verdict, 'availability', email));
    return verdict.silent ? { ok: true, message: THANKS } : { ok: false, message: verdict.message };
  }
  if (!payload.checkIn) return { ok: false, message: 'Pick a check-in date.' };
  const nights = Math.max(1, Math.min(30, Number(payload.nights) || 1));
  const adults = Math.max(1, Math.min(12, Number(payload.adults) || 2));

  const brief = [
    `STAYCATION AVAILABILITY CHECK — ${payload.hotelName}${payload.emirate ? ` (${payload.emirate})` : ''}`,
    '',
    `Check-in: ${payload.checkIn} · Nights: ${nights}`,
    `Party: ${adults} adult${adults === 1 ? '' : 's'}${payload.childrenAges.trim() ? `, children aged ${payload.childrenAges.trim()}` : ''}`,
    `Preferred meal plan: ${payload.mealPlan || 'no preference'}`,
    `Reply by: ${payload.channel || 'any'}${payload.phone.trim() ? ` · ${payload.phone.trim()}` : ''}`,
    payload.notes.trim() ? `Notes: ${payload.notes.trim()}` : null,
    '',
    'Next step: check availability and rates, then reply with priced options — same day where possible.',
  ]
    .filter((l) => l !== null)
    .join('\n');

  if (isSupabaseConfigured()) {
    const db = createAdminClient();
    const { error } = await db.from('enquiries').insert({
      name,
      email,
      phone: payload.phone.trim() || null,
      // The brand name in the title files this into the Staycations workspace.
      package_title: `Availability — ${payload.hotelName} · Premium Choice Staycations`,
      travel_dates: `${payload.checkIn} · ${nights} night${nights === 1 ? '' : 's'}`,
      travellers: `${adults} adults${payload.childrenAges.trim() ? `, children ${payload.childrenAges.trim()}` : ''}`,
      message: brief,
      status: 'new',
    });
    if (error) {
      console.error('[availability]', error.message);
      return { ok: false, message: 'Something went wrong — please try again or call us.' };
    }
  }

  const brand = emailBrand('staycations');

  const notifyTo = process.env.ENQUIRY_NOTIFY_EMAIL;
  if (notifyTo) {
    await sendEmail({
      to: notifyTo,
      replyTo: email,
      subject: `[${brand.tag}] Availability check — ${payload.hotelName} · ${name}`,
      html: emailShell({
        brand,
        eyebrow: `Availability check · ${brand.tag}`,
        title: `${payload.hotelName} — ${name}`,
        bodyHtml: `<pre style="font-size:12px;line-height:1.6;white-space:pre-wrap;font-family:inherit">${brief
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</pre>`,
      }),
    });
  }

  await sendCustomerConfirmation({
    to: email,
    name,
    brandKey: 'staycations',
    heading: 'We are checking those dates',
    intro: `Thank you for asking about ${payload.hotelName}. A specialist is checking availability and rates now, and will come back to you with priced options — usually the same working day.`,
    rows: [
      ['Hotel', payload.hotelName],
      ['Check-in', `${payload.checkIn} · ${nights} night${nights === 1 ? '' : 's'}`],
      ['Guests', `${adults} adult${adults === 1 ? '' : 's'}${payload.childrenAges.trim() ? `, children aged ${payload.childrenAges.trim()}` : ''}`],
      ['Meal plan', payload.mealPlan && payload.mealPlan !== 'No preference' ? payload.mealPlan : null],
      ['We will reply by', payload.channel || null],
    ],
    caveat:
      'Nothing is booked or held at this stage — we are looking at what is available for your dates and will send you the options.',
  });

  return { ok: true, message: THANKS };
}
