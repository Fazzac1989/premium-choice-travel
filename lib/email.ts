import 'server-only';

/**
 * Thin Resend wrapper. Without RESEND_API_KEY everything no-ops gracefully —
 * enquiries and quotes still land in the admin, emails are simply skipped.
 */
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  /** Files to attach, e.g. a voucher PDF. Buffers are base64-encoded here. */
  attachments?: { filename: string; content: Buffer | string }[];
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  // "a@x.com, b@y.com" → both get a copy.
  const recipients = to.split(',').map((t) => t.trim()).filter(Boolean);
  const from = process.env.RESEND_FROM || 'Premium Choice Travel <onboarding@resend.dev>';
  if (!apiKey) return { ok: true, skipped: true };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments?.length
          ? {
              attachments: attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
              })),
            }
          : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[email] resend error', res.status, body);
      return { ok: false, error: `Email failed (${res.status})` };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[email]', e?.message);
    return { ok: false, error: 'Email failed' };
  }
}

const BRAND_TEAL = '#19BAAB';
const BRAND_INK = '#16242E';

/**
 * The shell every email shares.
 *
 * `brand` names which of the six sites the message concerns. Staff mail also
 * carries a teal band under the header saying so, because six websites feed
 * one inbox and a glance should be enough to tell a staycation weekend from a
 * school trip.
 */
export function emailShell({
  title,
  bodyHtml,
  cta,
  brand,
  eyebrow,
}: {
  title: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  brand?: { name: string; site: string };
  /** Small line above the title, e.g. "Booking request · Staycations". */
  eyebrow?: string;
}) {
  const name = brand?.name ?? 'Premium Choice Travel';
  const site = brand?.site ?? 'premiumchoicetravel.com';
  // "Premium Choice Staycations" → "Premium Choice" + accented last word.
  const words = name.split(' ');
  const lead = words.slice(0, 2).join(' ');
  const rest = words.slice(2).join(' ');

  return `<!doctype html><html><body style="margin:0;background:#F6F4EF;font-family:Arial,Helvetica,sans-serif;color:${BRAND_INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="background:${BRAND_INK};border-radius:12px 12px 0 0;padding:24px 32px">
        <span style="font-size:18px;font-weight:bold;color:#fff">${lead} <span style="color:${BRAND_TEAL}">${rest || 'Travel'}</span></span>
      </td></tr>
      ${eyebrow ? `<tr><td style="background:${BRAND_TEAL};padding:9px 32px"><span style="font-size:11px;font-weight:bold;letter-spacing:1.4px;text-transform:uppercase;color:#ffffff">${eyebrow}</span></td></tr>` : ''}
      <tr><td style="background:#ffffff;padding:32px;border:1px solid #e6e6e6;border-top:0;border-radius:0 0 12px 12px">
        <h1 style="margin:0 0 16px;font-size:22px;color:${BRAND_INK}">${title}</h1>
        ${bodyHtml}
        ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="background:${BRAND_TEAL};border-radius:999px"><a href="${cta.url}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px">${cta.label}</a></td></tr></table>` : ''}
        <p style="margin:24px 0 0;font-size:12px;color:#8a969c">${name} · ${site}<br/>Premium Choice Travel JLT · Dubai, UAE · +971 4 420 6965 · info@premiumchoicetravel.com</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/** A key/value block — how every staff notification lists the facts. */
export function emailRows(rows: [string, string | null | undefined][]) {
  const cells = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;font-size:13px;color:#8a969c;width:38%;vertical-align:top">${k}</td><td style="padding:7px 0;font-size:14px;color:${BRAND_INK};font-weight:bold">${v}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee">${cells}</table>`;
}
