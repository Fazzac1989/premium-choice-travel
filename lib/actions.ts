'use server';

import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { emailShell, sendEmail } from '@/lib/email';

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
      subject: `New enquiry — ${name}${packageTitle ? ` · ${packageTitle}` : ''}`,
      html: emailShell({
        title: 'New website enquiry',
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

  return { ok: true, message: 'Thank you — we’ll come back to you within one working day.' };
}
