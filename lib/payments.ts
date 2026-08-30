import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import type { Payment } from '@/lib/payments-shared';

export type { Payment };

/**
 * The payment plan attached to a quote.
 *
 * A record of what was agreed and what has arrived — not a payment processor.
 * Nothing here can take money, and nothing that could take money is stored.
 */

export function mapPayment(row: any): Payment {
  return {
    id: row.id,
    label: row.label ?? '',
    amount: Number(row.amount) || 0,
    dueDate: row.due_date ?? '',
    paidAt: row.paid_at ?? '',
    method: row.method ?? '',
    reference: row.reference ?? '',
    notes: row.notes ?? '',
  };
}

export async function getPayments(quoteId: number): Promise<Payment[]> {
  if (!isSupabaseConfigured()) return [];
  const db = createAdminClient();
  const { data } = await db
    .from('quote_payments')
    .select('*')
    .eq('quote_id', quoteId)
    .order('sort_order');
  return (data ?? []).map(mapPayment);
}

export type ScheduleSummary = {
  scheduled: number;
  paid: number;
  outstanding: number;
  /** Scheduled minus the quote total — non-zero means the plan does not add up. */
  difference: number;
  next: Payment | null;
  overdue: Payment[];
};

/**
 * The arithmetic a specialist would otherwise do in their head.
 *
 * `difference` exists because a schedule that does not sum to the quote total
 * is the mistake that actually happens — a deposit changed and the balance
 * left alone — and it is far cheaper to catch before the quote is sent than
 * after the customer has paid the wrong amount.
 */
export function summarise(payments: Payment[], quoteTotal: number): ScheduleSummary {
  const scheduled = payments.reduce((s, p) => s + p.amount, 0);
  const paid = payments.filter((p) => p.paidAt).reduce((s, p) => s + p.amount, 0);
  const unpaid = payments.filter((p) => !p.paidAt && p.dueDate);
  const today = new Date().toISOString().slice(0, 10);

  return {
    scheduled,
    paid,
    outstanding: scheduled - paid,
    difference: Math.round((scheduled - quoteTotal) * 100) / 100,
    next: unpaid.filter((p) => p.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null,
    overdue: unpaid.filter((p) => p.dueDate < today),
  };
}

/**
 * A sensible starting plan: a quarter now, the rest six weeks before travel.
 *
 * Only a starting point — a specialist edits every line, and the balance date
 * is left blank when we do not know when they are travelling rather than
 * inventing one.
 */
export function suggestSchedule(total: number, travelDate: string | null) {
  const deposit = Math.round(total * 0.25);
  let balanceDue = '';
  if (travelDate && /^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
    const d = new Date(`${travelDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 42);
    const today = new Date().toISOString().slice(0, 10);
    const candidate = d.toISOString().slice(0, 10);
    // Six weeks before a trip that is already closer than that is not a date.
    balanceDue = candidate > today ? candidate : '';
  }
  return [
    { label: 'Deposit', amount: deposit, dueDate: '' },
    { label: 'Balance', amount: Math.round((total - deposit) * 100) / 100, dueDate: balanceDue },
  ];
}
