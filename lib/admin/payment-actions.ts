'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';

export type PaymentState = { ok: boolean; message: string } | null;

type IncomingPayment = {
  id?: number;
  label: string;
  amount: number;
  dueDate: string;
  paidAt: string;
  method: string;
  reference: string;
  notes: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Replace a quote's schedule with what the editor submitted.
 *
 * Wholesale replacement rather than a diff: a schedule is a handful of rows a
 * specialist rearranges freely, and reconciling adds and removes would be more
 * ways to go wrong than it saves.
 */
export async function savePaymentSchedule(_prev: PaymentState, formData: FormData): Promise<PaymentState> {
  await requireAdmin();
  const quoteId = Number(formData.get('quote_id'));
  if (!quoteId) return { ok: false, message: 'Quote not found.' };

  let rows: IncomingPayment[] = [];
  try {
    rows = JSON.parse(String(formData.get('payments') ?? '[]'));
  } catch {
    return { ok: false, message: 'Could not read the schedule.' };
  }

  const clean = rows
    .filter((p) => p.label?.trim())
    .map((p, i) => ({
      quote_id: quoteId,
      sort_order: i,
      label: String(p.label).trim().slice(0, 80),
      amount: Number(p.amount) || 0,
      due_date: DATE.test(p.dueDate ?? '') ? p.dueDate : null,
      // A tick in the editor becomes a timestamp; an existing one is kept.
      paid_at: p.paidAt ? p.paidAt : null,
      method: String(p.method ?? '').trim().slice(0, 60) || null,
      reference: String(p.reference ?? '').trim().slice(0, 120) || null,
      notes: String(p.notes ?? '').trim().slice(0, 300) || null,
    }));

  const db = createAdminClient();
  const { error: clearError } = await db.from('quote_payments').delete().eq('quote_id', quoteId);
  if (clearError) return { ok: false, message: clearError.message };

  if (clean.length > 0) {
    const { error } = await db.from('quote_payments').insert(clean);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true, message: clean.length ? 'Schedule saved.' : 'Schedule cleared.' };
}
