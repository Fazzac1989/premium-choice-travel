'use server';

import { headers } from 'next/headers';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { describeRejection, guardPayloadFromForm, guardSubmission, remoteIpFrom } from '@/lib/spam-guard';
import { emailShell, sendEmail } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';
import { getAccount } from '@/lib/account';
import { sendCustomerConfirmation } from '@/lib/email-customer';
import { sendSignInLink } from '@/lib/sign-in-link';

export type EnquiryState = { ok: boolean; message: string } | null;

const THANKS = 'Thank you — we’ll come back to you as quickly as we can, typically within one working day. We have emailed you a copy.';

/** Said only when a link actually went out, so it is never a promise of an email nobody sent. */
const TRACK = (email: string) =>
  `We have also sent  a link to sign in, so you can follow this enquiry and see any quote online.`;

/**
 * The golf form's trip brief (golfers, non-golfers, rooms, departure, budget).
 * It goes into the enquiry's existing travellers and message fields, so the
 * specialist sees it everywhere an enquiry is shown and no column is needed.
 */
function golfBrief(formData: FormData): { travellers: string; lines: string[] } {
  const field = (k: string) => String(formData.get(k) ?? '').trim().slice(0, 120);
  const count = (k: string) => {
    const n = Number(field(k));
    return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 500) : 0;
  };
  const golfers = count('golfers');
  const nonGolfers = count('non_golfers');
  const travellers = [
    golfers ? `${golfers} golfer${golfers === 1 ? '' : 's'}` : '',
    nonGolfers ? `${nonGolfers} non-golfer${nonGolfers === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(', ');
  const lines = [
    field('rooms') && `Rooms: ${field('rooms')}`,
    field('departure') && `Travelling from: ${field('departure')}`,
    field('budget') && `Budget per person: ${field('budget')}`,
  ].filter(Boolean) as string[];
  return { travellers, lines };
}

export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const travelDates = String(formData.get('travel_dates') ?? '').trim();
  const brief = golfBrief(formData);
  const travellers = String(formData.get('travellers') ?? '').trim() || brief.travellers;
  const message = [brief.lines.join('\n'), String(formData.get('message') ?? '').trim()].filter(Boolean).join('\n\n');
  const packageId = formData.get('package_id') ? Number(formData.get('package_id')) : null;
  const packageTitle = String(formData.get('package_title') ?? '').trim() || null;
  // Which of the six sites this form was on; the master site sends nothing.
  const brand = emailBrand(String(formData.get('brand') ?? '').trim());

  if (!name || !email) return { ok: false, message: 'Please tell us your name and email.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'That email address doesn’t look right.' };

  // Bots first, before anything is stored or sent. A silent rejection is
  // answered with the ordinary thank-you, so the bot learns nothing.
  const verdict = await guardSubmission({
    ...(guardPayloadFromForm(formData)),
    fields: [name, travelDates, travellers, message],
    remoteIp: remoteIpFrom(headers().get('x-forwarded-for')),
  });
  if (!verdict.ok) {
    console.warn(describeRejection(verdict, 'enquiry', email));
    return verdict.silent ? { ok: true, message: THANKS } : { ok: false, message: verdict.message };
  }

  if (isSupabaseConfigured()) {
    const db = createAdminClient();
    const { error } = await db.from('enquiries').insert({
      name,
      email,
      phone: phone || null,
      package_id: packageId,
      package_title: packageTitle,
      travel_dates: travelDates || null,
      travellers: travellers || null,
      message: message || null,
      status: 'new',
      customer_id: (await getAccount())?.id ?? null,
    });
    if (error) {
      console.error('[enquiry]', error.message);
      return { ok: false, message: 'Something went wrong — please try again or call us.' };
    }
  } else {
    console.log('[enquiry] Supabase not configured; enquiry logged only:', { name, email, packageTitle });
  }

  const notifyTo = process.env.ENQUIRY_NOTIFY_EMAIL;
  if (notifyTo) {
    await sendEmail({
      to: notifyTo,
      replyTo: email,
      subject: `[${brand.tag}] New enquiry — ${name}${packageTitle ? ` · ${packageTitle}` : ''}`,
      html: emailShell({
        brand,
        eyebrow: `Website enquiry · ${brand.tag}`,
        title: `${name}${packageTitle ? ` — ${packageTitle}` : ''}`,
        bodyHtml: `<p style="font-size:14px;line-height:1.6">
          <strong>${name}</strong> (${email}${phone ? `, ${phone}` : ''})<br/>
          ${packageTitle ? `Package: ${packageTitle}<br/>` : ''}
          ${travelDates ? `Dates: ${travelDates}<br/>` : ''}
          ${travellers ? `Travellers: ${travellers}<br/>` : ''}
          ${message ? `<br/>${message.replace(/\n/g, '<br/>')}` : ''}
        </p>`,
      }),
    });
  }

  await sendCustomerConfirmation({
    to: email,
    name,
    brandKey: brand.key,
    heading: 'Thank you for getting in touch',
    intro: 'We have your enquiry and one of our specialists is reading it now. You will hear from a person — not an automated reply — usually within one working day.',
    rows: [
      ['Enquiry about', packageTitle],
      ['Travel dates', travelDates || null],
      ['Travellers', travellers || null],
    ],
    caveat: 'Nothing is booked or held at this stage. We will come back to you with ideas and prices first.',
  });

  /**
   * An account, if they asked for one.
   *
   * There is nothing to create: signing in here is a link in an email and
   * Supabase makes the account when the address is new. The enquiry just went
   * in under this address, and /auth/callback claims past activity by email,
   * so clicking the link is enough to see it.
   *
   * Only when the box was ticked, and never for somebody already signed in —
   * their enquiry already carries their id, and a sign-in link to someone with
   * a live session is noise. If the link fails to send, the enquiry still
   * succeeded: that is the thing they came to do, and it is already saved.
   */
  if (formData.get('create_account') === 'on' && !(await getAccount())) {
    const sent = await sendSignInLink(email, brand.key === 'holidays' ? '/manage' : '/account');
    if (sent.ok) return { ok: true, message: `${THANKS} ${TRACK(email)}` };
    console.warn('[enquiry] sign-in link not sent:', sent.reason);
  }

  return { ok: true, message: THANKS };
}
