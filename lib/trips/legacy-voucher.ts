import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { emailShell, sendEmail } from '@/lib/email-core';
import { emailBrand } from '@/lib/email-brand-core';
import VoucherDoc from '@/lib/pdf/voucher-doc';
import { voucherModel } from '@/lib/voucher-model';

/**
 * Vouchers for stays booked before the platform (founder, 2026-10-02: the trade platform is the
 * only rates provider). Those requests were confirmed by a specialist and keep the supplier's
 * reply on the row, so their voucher is still drawn here; a stay booked through the platform
 * gets the platform's voucher instead (`/api/trips/[id]/voucher`).
 */

export function money(n: number, currency: string) {
  return `${currency} ${Math.round(n).toLocaleString('en-GB')}`;
}

export async function loadRequest(db: SupabaseClient, id: number) {
  const { data, error } = await db.from('booking_requests').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveRequest(db: SupabaseClient, id: number, patch: Record<string, unknown>) {
  const { error } = await db.from('booking_requests').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export function voucherFilename(row: any) {
  const hotel = String(row?.hotel_name ?? 'hotel').replace(/[^\w\s-]/g, '').trim();
  return `Voucher ${row?.supplier_reference ?? ''} - ${hotel}.pdf`;
}

/** The voucher PDF for a confirmed request, or null when nothing is confirmed. */
export async function renderVoucherPdf(row: any): Promise<Buffer | null> {
  const v = voucherModel(row);
  if (!v) return null;
  return renderToBuffer(createElement(VoucherDoc, { v }) as any);
}

/** Email the voucher to the customer, with a copy to the team inbox. */
export async function emailVoucherFor(db: SupabaseClient, row: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const pdf = await renderVoucherPdf(row);
    if (!pdf) return { ok: false, error: 'nothing confirmed to print' };
    const brand = emailBrand('staycations');
    const staff = process.env.ENQUIRY_NOTIFY_EMAIL;
    const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const res = await sendEmail({
      to: [row.email, staff].filter(Boolean).join(', '),
      subject: `Your hotel voucher — ${row.hotel_name} (${row.supplier_reference})`,
      html: emailShell({
        brand,
        eyebrow: 'Booking confirmed',
        title: `${row.hotel_name} is booked`,
        bodyHtml:
          `<p>Dear ${esc(row.holder_name || row.name)},</p>` +
          `<p>Your stay at <strong>${esc(row.hotel_name)}</strong> from ${esc(row.check_in)} for ${row.nights} night${row.nights === 1 ? '' : 's'} is confirmed. ` +
          `Your voucher is attached — please show it at check-in. The booking reference is <strong>${esc(row.supplier_reference)}</strong>.</p>` +
          (row.rate_comments ? `<p><strong>Please note:</strong> ${esc(row.rate_comments).replace(/\n/g, '<br>')}</p>` : '') +
          `<p>Anything at all before you travel, call us on +971 4 420 6965.</p>`,
      }),
      attachments: [{ filename: voucherFilename(row), content: pdf }],
    });
    if (res.ok && !res.skipped) await saveRequest(db, row.id, { voucher_sent_at: new Date().toISOString() });
    if (!res.ok) return { ok: false, error: res.error };
    return res.skipped ? { ok: false, error: 'email is not configured (RESEND_API_KEY)' } : { ok: true };
  } catch (e: any) {
    console.error('[voucher email]', e?.message ?? e);
    return { ok: false, error: String(e?.message ?? e) };
  }
}
