import 'server-only';
import { emailRows, emailShell, sendEmail } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';

/**
 * The reply a customer gets, from whichever brand they contacted.
 *
 * Until now nobody who used the site heard anything back until a specialist
 * wrote to them by hand — which on a Friday evening could be a long silence
 * after handing over your details. This says we have it, repeats what they
 * asked for so they can check it, and says when to expect a person.
 *
 * It never confirms anything. A booking request in particular has to read as
 * a request, or someone turns up at a hotel that is not expecting them.
 */
export async function sendCustomerConfirmation({
  to,
  name,
  brandKey,
  heading,
  intro,
  rows,
  /** Shown in a tinted box — used to say plainly that nothing is booked yet. */
  caveat,
}: {
  to: string;
  name: string;
  brandKey: string;
  heading: string;
  intro: string;
  rows: [string, string | null | undefined][];
  caveat?: string;
}) {
  const brand = emailBrand(brandKey);
  const firstName = name.trim().split(/\s+/)[0] || 'there';

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.65">Hello ${firstName},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.65">${intro}</p>
    ${rows.length ? emailRows(rows) : ''}
    ${
      caveat
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0"><tr><td style="background:#F6F4EF;border-left:3px solid #19BAAB;padding:14px 16px;font-size:13px;line-height:1.6;color:#16242E">${caveat}</td></tr></table>`
        : ''
    }
    <p style="margin:22px 0 0;font-size:15px;line-height:1.65">
      If anything above is wrong, or you think of something else, just reply to this email —
      it comes straight to us.
    </p>
    <p style="margin:20px 0 0;font-size:15px;line-height:1.65">
      Best wishes,<br/>
      <strong>The ${brand.name} team</strong><br/>
      <span style="color:#8a969c;font-size:13px">${brand.blurb}</span>
    </p>`;

  return sendEmail({
    to,
    subject: `${heading} — ${brand.name}`,
    html: emailShell({
      title: heading,
      bodyHtml: body,
      brand,
      cta: { label: `Visit ${brand.tag}`, url: `https://${brand.site}` },
    }),
  });
}
