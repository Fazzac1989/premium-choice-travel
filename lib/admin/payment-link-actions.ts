'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { createLinkForQuote, verifyLink } from '@/lib/payments/links';
import { getQuoteById } from '@/lib/quotes';

/**
 * Creating and confirming payment links from the quote page.
 *
 * A specialist decides the amount and who it is for; nothing generates a
 * link on its own, and nothing here can mark money received — only the
 * gateway's own answer does that, through verifyLink.
 */

export type LinkState = { ok: boolean; message: string; url?: string } | null;

export async function createPaymentLinkAction(_prev: LinkState, formData: FormData): Promise<LinkState> {
  await requireAdmin();
  const quoteId = Number(formData.get('quote_id'));
  if (!Number.isFinite(quoteId)) return { ok: false, message: 'Unknown quote.' };

  const quote = await getQuoteById(quoteId);
  if (!quote) return { ok: false, message: 'Unknown quote.' };

  const paymentRaw = String(formData.get('payment_id') ?? '');
  const amount = Number(String(formData.get('amount') ?? '').replace(/,/g, ''));
  const validity = Number(formData.get('validity_hours')) || 48;

  const result = await createLinkForQuote({
    quoteId,
    quoteRef: quote.ref,
    paymentId: paymentRaw ? Number(paymentRaw) : null,
    amount,
    currency: quote.currency,
    customerName: String(formData.get('customer_name') ?? quote.clientName ?? '').trim(),
    customerEmail: String(formData.get('customer_email') ?? quote.clientEmail ?? '').trim(),
    customerMobile: String(formData.get('customer_mobile') ?? quote.clientPhone ?? '').trim(),
    validityMinutes: Math.round(validity * 60),
    createdBy: (await requireAdmin()).email,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://premiumchoicetravel.com',
  });

  revalidatePath(`/admin/quotes/${quoteId}`);
  if (!result.ok) return { ok: false, message: result.error };
  return {
    ok: true,
    message: `Link created for ${quote.currency} ${result.link.amount.toLocaleString('en-GB')}. Send it to the customer yourself — nothing has been emailed.`,
    url: result.link.url,
  };
}

export async function verifyPaymentLinkAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('link_id'));
  const quoteId = Number(formData.get('quote_id'));
  if (!Number.isFinite(id)) return;
  await verifyLink(id);
  revalidatePath(`/admin/quotes/${quoteId}`);
}
