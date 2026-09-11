import type { SupabaseClient } from '@supabase/supabase-js';
import { checkPaymentStatus, createPaymentLink, mswipeConfig } from './mswipe';
import { emailVoucherFor } from '@/lib/rates/supplier-booking';
import { emailShell, sendEmail } from '@/lib/email-core';
import { emailBrand } from '@/lib/email-brand-core';

/**
 * Payment links, and the one rule that matters about them.
 *
 * A link is a request for money. It becomes a payment only when the gateway
 * tells us so in an answer we asked for — never because something posted to
 * our callback saying it did. Mswipe's callback carries no signature, so it
 * is a prompt to go and check, nothing more.
 *
 * The database client is passed in rather than imported, so the admin actions
 * and the support scripts run exactly the same code.
 */

export type PaymentLinkRow = {
  id: number;
  createdAt: string;
  quoteId: number | null;
  paymentId: number | null;
  invoiceId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  txnId: string;
  encryptedId: string;
  url: string;
  expiresAt: string;
  status: string;
  paidAt: string;
  gatewayPaymentId: string;
  verifiedAt: string;
  lastCheckedAt: string;
  createdBy: string;
};

export function map(row: any): PaymentLinkRow {
  return {
    id: row.id,
    createdAt: row.created_at,
    quoteId: row.quote_id,
    paymentId: row.payment_id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount) || 0,
    currency: row.currency ?? 'AED',
    customerName: row.customer_name ?? '',
    customerEmail: row.customer_email ?? '',
    customerMobile: row.customer_mobile ?? '',
    txnId: row.txn_id ?? '',
    encryptedId: row.encrypted_id ?? '',
    url: row.url ?? '',
    expiresAt: row.expires_at ?? '',
    status: row.status ?? 'created',
    paidAt: row.paid_at ?? '',
    gatewayPaymentId: row.gateway_payment_id ?? '',
    verifiedAt: row.verified_at ?? '',
    lastCheckedAt: row.last_checked_at ?? '',
    createdBy: row.created_by ?? '',
  };
}

export function needsMigration(message: string) {
  return /relation .*payment_links.* does not exist|schema cache/i.test(message);
}

export async function listPaymentLinks(db: SupabaseClient, quoteId: number): Promise<PaymentLinkRow[]> {
  const { data, error } = await db
    .from('payment_links')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false });
  // The panel explains a missing table itself rather than exploding the page.
  if (error) return [];
  return (data ?? []).map(map);
}

export async function listLinksForBooking(db: SupabaseClient, bookingRequestId: number): Promise<PaymentLinkRow[]> {
  const { data, error } = await db
    .from('payment_links')
    .select('*')
    .eq('booking_request_id', bookingRequestId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(map);
}

/** The reference the gateway echoes back to us. Unique, and readable in a dispute. */
function invoiceIdFor(prefix: string) {
  return `PCT-${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export type CreateLinkInput = {
  quoteId: number;
  quoteRef: string;
  paymentId: number | null;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  validityMinutes?: number;
  createdBy: string;
  siteUrl: string;
};

export async function createLinkForQuote(
  db: SupabaseClient,
  input: CreateLinkInput,
): Promise<{ ok: true; link: PaymentLinkRow } | { ok: false; error: string }> {
  const cfg = mswipeConfig();
  if (!cfg) return { ok: false, error: 'Mswipe is not configured on this deployment — see docs/mswipe.md.' };
  if (!(input.amount > 0)) return { ok: false, error: 'Enter an amount above zero.' };
  if (!input.customerEmail && !input.customerMobile) {
    return { ok: false, error: 'The gateway needs an email address or a mobile number to send the link to.' };
  }
  // The gateway prices in dirhams; a quote in another currency would be paid
  // at a number we never agreed.
  if ((input.currency || 'AED').toUpperCase() !== 'AED') {
    return { ok: false, error: `This gateway settles in AED, and the quote is in ${input.currency}. Take this one by transfer.` };
  }

  const invoiceId = invoiceIdFor(`Q${input.quoteId}`);

  let link;
  try {
    link = await createPaymentLink({
      invoiceId,
      amount: input.amount,
      customerEmail: input.customerEmail,
      customerMobile: input.customerMobile,
      callbackUrl: `${input.siteUrl.replace(/\/+$/, '')}/api/payments/mswipe/callback`,
      notes: ['Premium Choice Travel', input.quoteRef, input.customerName.slice(0, 40), ''],
      validityMinutes: input.validityMinutes,
    });
  } catch (e: any) {
    console.error('[mswipe link]', e?.message ?? e);
    return { ok: false, error: `The gateway refused: ${String(e?.message ?? e).slice(0, 200)}` };
  }

  const { data, error } = await db
    .from('payment_links')
    .insert({
      scope: 'quote',
      quote_id: input.quoteId,
      payment_id: input.paymentId,
      invoice_id: invoiceId,
      amount: input.amount,
      currency: 'AED',
      customer_name: input.customerName || null,
      customer_email: input.customerEmail || null,
      customer_mobile: input.customerMobile || null,
      txn_id: link.txnId,
      encrypted_id: link.encryptedId,
      url: link.url,
      expires_at: link.expiresAt,
      created_by: input.createdBy,
      raw: link.raw,
    })
    .select('*')
    .single();

  if (error) {
    // The link exists at the gateway; losing our record of it is the worse
    // failure, so say exactly what happened rather than pretending it failed.
    console.error('[mswipe link store]', error.message);
    return {
      ok: false,
      error: needsMigration(error.message)
        ? 'The payment_links table is missing — paste supabase/migrations/020-payment-links.sql into the Supabase SQL editor, then try again.'
        : `The link was created at the gateway (${link.txnId}) but could not be saved: ${error.message}`,
    };
  }

  return { ok: true, link: map(data) };
}

/**
 * A link for a stay a specialist has just confirmed with the supplier.
 *
 * The amount is whatever the customer was shown on the request, read from
 * the row rather than passed in, so nobody can be asked for a figure they
 * never saw.
 */
export async function createLinkForBooking(
  db: SupabaseClient,
  input: { request: any; createdBy: string; siteUrl: string; validityMinutes?: number },
): Promise<{ ok: true; link: PaymentLinkRow } | { ok: false; error: string }> {
  const r = input.request;
  const cfg = mswipeConfig();
  if (!cfg) return { ok: false, error: 'Mswipe is not configured on this deployment.' };

  const amount = Number(r.amount);
  if (!(amount > 0)) return { ok: false, error: 'This request carries no amount to charge.' };
  if (String(r.currency ?? 'AED').toUpperCase() !== 'AED') {
    return { ok: false, error: `The gateway settles in AED and this request is in ${r.currency}. Take it by transfer.` };
  }
  if (!r.email && !r.phone) return { ok: false, error: 'The customer has no email address or mobile number on this request.' };

  const invoiceId = invoiceIdFor(`B${r.id}`);
  let link;
  try {
    link = await createPaymentLink({
      invoiceId,
      amount,
      customerEmail: r.email ?? '',
      customerMobile: r.phone ?? '',
      callbackUrl: `${input.siteUrl.replace(/\/+$/, '')}/api/payments/mswipe/callback`,
      notes: ['Premium Choice Staycations', String(r.hotel_name ?? '').slice(0, 40), `PCS-${r.id}`, ''],
      validityMinutes: input.validityMinutes,
    });
  } catch (e: any) {
    console.error('[mswipe booking link]', e?.message ?? e);
    return { ok: false, error: `The gateway refused: ${String(e?.message ?? e).slice(0, 200)}` };
  }

  const { data, error } = await db
    .from('payment_links')
    .insert({
      scope: 'booking',
      booking_request_id: r.id,
      invoice_id: invoiceId,
      amount,
      currency: 'AED',
      customer_name: [r.holder_name, r.holder_surname].filter(Boolean).join(' ') || r.name || null,
      customer_email: r.email || null,
      customer_mobile: r.phone || null,
      txn_id: link.txnId,
      encrypted_id: link.encryptedId,
      url: link.url,
      expires_at: link.expiresAt,
      created_by: input.createdBy,
      raw: link.raw,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[mswipe booking link store]', error.message);
    return {
      ok: false,
      error: needsMigration(error.message) || /booking_request_id/.test(error.message)
        ? 'The payment columns are missing — paste supabase/migrations/021-booking-payment-links.sql into the Supabase SQL editor, then try again.'
        : `The link was created at the gateway (${link.txnId}) but could not be saved: ${error.message}`,
    };
  }

  const row = map(data);
  await db.from('booking_requests').update({ payment_link_id: row.id }).eq('id', r.id);
  return { ok: true, link: row };
}

/** "Your stay is booked, here is how to pay." The voucher follows the money. */
export async function emailPaymentRequest(
  row: any,
  link: PaymentLinkRow,
): Promise<{ ok: boolean; error?: string }> {
  const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const money = `AED ${link.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const res = await sendEmail({
    to: [row.email, process.env.ENQUIRY_NOTIFY_EMAIL].filter(Boolean).join(', '),
    subject: `Your stay at ${row.hotel_name} — ${money} to confirm`,
    html: emailShell({
      brand: emailBrand('staycations'),
      eyebrow: 'Payment requested',
      title: `${row.hotel_name} is held for you`,
      bodyHtml:
        `<p>Dear ${esc(row.holder_name || row.name)},</p>` +
        `<p>Your room at <strong>${esc(row.hotel_name)}</strong> from ${esc(row.check_in)} for ${row.nights} night${row.nights === 1 ? '' : 's'} is booked with the hotel.</p>` +
        `<p>To complete it, please pay <strong>${money}</strong> using the secure link below. It is handled by our payment provider — we never see your card details.</p>` +
        (link.expiresAt ? `<p>The link is valid until ${new Date(link.expiresAt).toUTCString().replace('GMT', 'UTC')}. If it expires, tell us and we will send another.</p>` : '') +
        (row.rate_comments ? `<p><strong>Please note:</strong> ${esc(row.rate_comments).replace(/\n/g, '<br>')}</p>` : '') +
        `<p>Your voucher follows as soon as the payment clears.</p>` +
        `<p>Anything at all, call us on +971 4 420 6965.</p>`,
      cta: { label: `Pay ${money}`, url: link.url },
    }),
  });
  if (!res.ok) return { ok: false, error: res.error };
  return res.skipped ? { ok: false, error: 'email is not configured (RESEND_API_KEY)' } : { ok: true };
}

/**
 * Confirm a link with the gateway and record the result.
 *
 * Safe to call repeatedly: a link already verified as paid is left alone, so
 * a callback arriving twice cannot double-record anything.
 */
export async function verifyLink(db: SupabaseClient, id: number): Promise<{ ok: boolean; status: string; detail: string }> {
  const { data: row } = await db.from('payment_links').select('*').eq('id', id).maybeSingle();
  if (!row) return { ok: false, status: 'unknown', detail: 'No such payment link.' };
  if (row.verified_at && row.status === 'paid') return { ok: true, status: 'paid', detail: 'Already confirmed.' };
  if (!row.encrypted_id) return { ok: false, status: row.status, detail: 'This link has no transaction id to check.' };

  let status;
  try {
    status = await checkPaymentStatus(row.encrypted_id);
  } catch (e: any) {
    console.error('[mswipe verify]', e?.message ?? e);
    await db.from('payment_links').update({ last_checked_at: new Date().toISOString() }).eq('id', id);
    return { ok: false, status: row.status, detail: `Could not reach the gateway: ${String(e?.message ?? e).slice(0, 160)}` };
  }

  const now = new Date().toISOString();
  if (!status.paid) {
    await db.from('payment_links').update({ last_checked_at: now, raw: status.raw }).eq('id', id);
    return { ok: true, status: row.status, detail: status.description || 'Not paid yet.' };
  }

  await db
    .from('payment_links')
    .update({ status: 'paid', paid_at: now, verified_at: now, last_checked_at: now, raw: status.raw })
    .eq('id', id);

  // A link tied to an instalment marks that instalment paid, once.
  if (row.payment_id) {
    const { data: instalment } = await db.from('quote_payments').select('paid_at').eq('id', row.payment_id).maybeSingle();
    if (instalment && !instalment.paid_at) {
      await db
        .from('quote_payments')
        .update({
          paid_at: now,
          method: 'Card (Mswipe)',
          reference: row.gateway_payment_id || row.txn_id || row.invoice_id,
        })
        .eq('id', row.payment_id);
    }
  }

  // A stay that has just been paid for gets its voucher, once.
  let voucherNote = '';
  if (row.booking_request_id) {
    const { data: request } = await db.from('booking_requests').select('*').eq('id', row.booking_request_id).maybeSingle();
    if (request) {
      if (!request.paid_at) await db.from('booking_requests').update({ paid_at: now }).eq('id', request.id);
      if (request.voucher_sent_at) {
        voucherNote = ' The voucher had already been sent.';
      } else if (!request.supplier_reference) {
        // Paid before the supplier confirmed: money in, nothing to voucher yet.
        voucherNote = ' No voucher yet — this stay is not confirmed with the hotel.';
      } else {
        const sent = await emailVoucherFor(db, { ...request, paid_at: now });
        voucherNote = sent.ok
          ? ` Voucher emailed to ${request.email}.`
          : ` Voucher NOT emailed: ${sent.error ?? 'unknown error'} — send it from the request.`;
      }
    }
  }

  return { ok: true, status: 'paid', detail: `Paid${status.paidAt ? ` on ${status.paidAt}` : ''}.${voucherNote}` };
}

/**
 * Handle a callback from the gateway. The body is treated as untrusted: it
 * only tells us which of our own links to go and verify.
 */
export async function handleCallback(
  db: SupabaseClient,
  orderId: string,
  gatewayPaymentId: string,
): Promise<{ found: boolean; status: string }> {
  if (!orderId) return { found: false, status: 'ignored' };
  const { data: row } = await db.from('payment_links').select('id').eq('invoice_id', orderId).maybeSingle();
  if (!row) return { found: false, status: 'unknown-order' };

  if (gatewayPaymentId) {
    await db.from('payment_links').update({ gateway_payment_id: gatewayPaymentId }).eq('id', row.id);
  }
  const result = await verifyLink(db, row.id);
  return { found: true, status: result.status };
}
