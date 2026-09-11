import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { checkPaymentStatus, createPaymentLink, mswipeConfig } from './mswipe';

/**
 * Payment links, and the one rule that matters about them.
 *
 * A link is a request for money. It becomes a payment only when the gateway
 * tells us so in an answer we asked for — never because something posted to
 * our callback saying it did. Mswipe's callback carries no signature, so it
 * is a prompt to go and check, nothing more.
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

function map(row: any): PaymentLinkRow {
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

const MISSING_TABLE = /relation .*payment_links.* does not exist|schema cache/i;

export function needsMigration(message: string) {
  return MISSING_TABLE.test(message);
}

export async function listPaymentLinks(quoteId: number): Promise<PaymentLinkRow[]> {
  if (!isSupabaseConfigured()) return [];
  const db = createAdminClient();
  const { data, error } = await db
    .from('payment_links')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false });
  // The panel explains a missing table itself rather than exploding the page.
  if (error) return [];
  return (data ?? []).map(map);
}

/** The reference the gateway echoes back to us. Unique, and readable in a dispute. */
function invoiceIdFor(quoteId: number) {
  return `PCT-Q${quoteId}-${Date.now().toString(36).toUpperCase()}`;
}

export async function createLinkForQuote(input: {
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
}): Promise<{ ok: true; link: PaymentLinkRow } | { ok: false; error: string }> {
  const cfg = mswipeConfig();
  if (!cfg) return { ok: false, error: 'Mswipe is not configured on this deployment — see docs/mswipe.md.' };
  if (!isSupabaseConfigured()) return { ok: false, error: 'The database is not configured.' };
  if (!(input.amount > 0)) return { ok: false, error: 'Enter an amount above zero.' };
  if (!input.customerEmail && !input.customerMobile) {
    return { ok: false, error: 'The gateway needs an email address or a mobile number to send the link to.' };
  }
  // The gateway prices in dirhams; a quote in another currency would be paid
  // at a number we never agreed.
  if ((input.currency || 'AED').toUpperCase() !== 'AED') {
    return { ok: false, error: `This gateway settles in AED, and the quote is in ${input.currency}. Take this one by transfer.` };
  }

  const invoiceId = invoiceIdFor(input.quoteId);
  const db = createAdminClient();

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
 * Confirm a link with the gateway and record the result.
 *
 * Safe to call repeatedly: a link already verified as paid is left alone, so
 * a callback arriving twice cannot double-record anything.
 */
export async function verifyLink(id: number): Promise<{ ok: boolean; status: string; detail: string }> {
  if (!isSupabaseConfigured()) return { ok: false, status: 'unknown', detail: 'The database is not configured.' };
  const db = createAdminClient();
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

  return { ok: true, status: 'paid', detail: `Paid${status.paidAt ? ` on ${status.paidAt}` : ''}.` };
}

/**
 * Handle a callback from the gateway. The body is treated as untrusted: it
 * only tells us which of our own links to go and verify.
 */
export async function handleCallback(orderId: string, gatewayPaymentId: string): Promise<{ found: boolean; status: string }> {
  if (!isSupabaseConfigured() || !orderId) return { found: false, status: 'ignored' };
  const db = createAdminClient();
  const { data: row } = await db.from('payment_links').select('id').eq('invoice_id', orderId).maybeSingle();
  if (!row) return { found: false, status: 'unknown-order' };

  if (gatewayPaymentId) {
    await db.from('payment_links').update({ gateway_payment_id: gatewayPaymentId }).eq('id', row.id);
  }
  const result = await verifyLink(row.id);
  return { found: true, status: result.status };
}
