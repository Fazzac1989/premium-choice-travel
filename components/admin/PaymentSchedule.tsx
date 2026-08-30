'use client';

import { useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { savePaymentSchedule, type PaymentState } from '@/lib/admin/payment-actions';
import type { Payment } from '@/lib/payments';

type Row = {
  label: string;
  amount: number;
  dueDate: string;
  paidAt: string;
  method: string;
  reference: string;
  notes: string;
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? 'Saving…' : 'Save schedule'}
    </button>
  );
}

const empty = (): Row => ({ label: '', amount: 0, dueDate: '', paidAt: '', method: '', reference: '', notes: '' });

/**
 * When and how the customer pays.
 *
 * Records the plan and what has arrived; it cannot take money and holds
 * nothing that could. The running difference against the quote total is the
 * point of the panel — a deposit edited without touching the balance is the
 * mistake that actually happens, and it is far cheaper to catch here than
 * after the customer has paid the wrong amount.
 */
export default function PaymentSchedule({
  quoteId,
  currency,
  quoteTotal,
  payments,
  travelDate,
}: {
  quoteId: number;
  currency: string;
  quoteTotal: number;
  payments: Payment[];
  travelDate: string;
}) {
  const [state, formAction] = useFormState<PaymentState, FormData>(savePaymentSchedule, null);
  const [rows, setRows] = useState<Row[]>(
    payments.length
      ? payments.map((p) => ({
          label: p.label,
          amount: p.amount,
          dueDate: p.dueDate,
          paidAt: p.paidAt,
          method: p.method,
          reference: p.reference,
          notes: p.notes,
        }))
      : [],
  );

  const set = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, n) => (n === i ? { ...r, ...patch } : r)));

  const money = (n: number) => `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const summary = useMemo(() => {
    const scheduled = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const paid = rows.filter((r) => r.paidAt).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return {
      scheduled,
      paid,
      outstanding: scheduled - paid,
      difference: Math.round((scheduled - quoteTotal) * 100) / 100,
    };
  }, [rows, quoteTotal]);

  const suggest = () => {
    const deposit = Math.round(quoteTotal * 0.25);
    let balanceDue = '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      const d = new Date(`${travelDate}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - 42);
      const candidate = d.toISOString().slice(0, 10);
      if (candidate > new Date().toISOString().slice(0, 10)) balanceDue = candidate;
    }
    setRows([
      { ...empty(), label: 'Deposit', amount: deposit },
      { ...empty(), label: 'Balance', amount: Math.round((quoteTotal - deposit) * 100) / 100, dueDate: balanceDue },
    ]);
  };

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-white p-6">
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="payments" value={JSON.stringify(rows)} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-ink">Payment schedule</h2>
          <p className="mt-1 text-sm text-ink-soft">
            What the customer pays and when. Shown on their quote.
          </p>
        </div>
        {rows.length === 0 && quoteTotal > 0 && (
          <button type="button" onClick={suggest} className="text-sm font-semibold text-teal-deep hover:underline">
            Suggest 25% deposit, balance six weeks before
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-5 space-y-3">
          {rows.map((r, i) => (
            <div key={i} className="rounded-xl bg-sand/60 p-4">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                <div>
                  <label className="field-label">What for</label>
                  <input
                    value={r.label}
                    onChange={(e) => set(i, { label: e.target.value })}
                    className="field"
                    placeholder="Deposit"
                  />
                </div>
                <div>
                  <label className="field-label">Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={r.amount}
                    onChange={(e) => set(i, { amount: Number(e.target.value) })}
                    className="field"
                  />
                </div>
                <div>
                  <label className="field-label">Due</label>
                  <input
                    type="date"
                    value={r.dueDate}
                    onChange={(e) => set(i, { dueDate: e.target.value })}
                    className="field"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((_, n) => n !== i))}
                    className="text-sm font-semibold text-ink-soft hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
                <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={Boolean(r.paidAt)}
                    onChange={(e) => set(i, { paidAt: e.target.checked ? new Date().toISOString() : '' })}
                    className="h-4 w-4 accent-teal"
                  />
                  Received
                </label>
                <div>
                  <label className="field-label">How it came in</label>
                  <input
                    value={r.method}
                    onChange={(e) => set(i, { method: e.target.value })}
                    className="field"
                    placeholder="Bank transfer · Card · Cash"
                  />
                </div>
                <div>
                  <label className="field-label">Reference</label>
                  <input
                    value={r.reference}
                    onChange={(e) => set(i, { reference: e.target.value })}
                    className="field"
                    placeholder="Bank ref, receipt no."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, empty()])}
        className="mt-4 text-sm font-semibold text-teal-deep hover:underline"
      >
        + Add an instalment
      </button>

      {rows.length > 0 && (
        <div className="mt-5 rounded-xl bg-ink p-4 text-white">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <p>
              <span className="text-white/60">Quote total </span>
              <strong>{money(quoteTotal)}</strong>
            </p>
            <p>
              <span className="text-white/60">Scheduled </span>
              <strong>{money(summary.scheduled)}</strong>
            </p>
            <p>
              <span className="text-white/60">Received </span>
              <strong className="text-teal">{money(summary.paid)}</strong>
            </p>
            <p>
              <span className="text-white/60">Outstanding </span>
              <strong>{money(summary.outstanding)}</strong>
            </p>
          </div>
          {summary.difference !== 0 && (
            <p className="mt-3 rounded-lg bg-amber-400/90 px-3 py-2 text-[13px] font-semibold text-ink">
              The schedule is {money(Math.abs(summary.difference))}{' '}
              {summary.difference > 0 ? 'more' : 'less'} than the quote total.
            </p>
          )}
        </div>
      )}

      {state && (
        <p className={`mt-3 text-sm ${state.ok ? 'text-teal-deep' : 'text-red-600'}`}>{state.message}</p>
      )}

      <div className="mt-5">
        <SaveButton />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        No money moves here — this records what was agreed and what has arrived. Payment links
        attach to these instalments once a provider is connected.
      </p>
    </form>
  );
}
