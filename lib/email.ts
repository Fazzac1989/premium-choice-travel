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
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
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
      body: JSON.stringify({ from, to: recipients, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
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

export function emailShell({ title, bodyHtml, cta }: { title: string; bodyHtml: string; cta?: { label: string; url: string } }) {
  return `<!doctype html><html><body style="margin:0;background:#F6F4EF;font-family:Arial,Helvetica,sans-serif;color:${BRAND_INK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="background:${BRAND_INK};border-radius:12px 12px 0 0;padding:24px 32px">
        <span style="font-size:18px;font-weight:bold;color:#fff">Premium <span style="color:${BRAND_TEAL}">Choice</span> Travel</span>
      </td></tr>
      <tr><td style="background:#ffffff;padding:32px;border:1px solid #e6e6e6;border-top:0;border-radius:0 0 12px 12px">
        <h1 style="margin:0 0 16px;font-size:22px;color:${BRAND_INK}">${title}</h1>
        ${bodyHtml}
        ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px"><tr><td style="background:${BRAND_TEAL};border-radius:999px"><a href="${cta.url}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px">${cta.label}</a></td></tr></table>` : ''}
        <p style="margin:24px 0 0;font-size:12px;color:#8a969c">Premium Choice Travel JLT · Dubai, UAE · +971 4 420 6965 · info@premiumchoicetravel.com</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
