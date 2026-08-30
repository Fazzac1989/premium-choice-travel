'use server';

import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { emailShell, sendEmail } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';
import { sendCustomerConfirmation } from '@/lib/email-customer';

export type EnquiryState = { ok: boolean; message: string } | null;

export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const travelDates = String(formData.get('travel_dates') ?? '').trim();
  const travellers = String(formData.get('travellers') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const packageId = formData.get('package_id') ? Number(formData.get('package_id')) : null;
  const packageTitle = String(formData.get('package_title') ?? '').trim() || null;
  // Which of the six sites this form was on; the master site sends nothing.
  const brand = emailBrand(String(formData.get('brand') ?? '').trim());

  if (!name || !email) return { ok: false, message: 'Please tell us your name and email.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'That email address doesn’t look right.' };

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

  return { ok: true, message: 'Thank you — we’ll come back to you as quickly as we can, typically within one working day. We have emailed you a copy.' };
}
