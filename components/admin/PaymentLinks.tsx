'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { createPaymentLinkAction, verifyPaymentLinkAction, type LinkState } from '@/lib/admin/payment-link-actions';
import type { PaymentLinkRow } from '@/lib/payments/links';
import type { Payment } from '@/lib/payments-shared';

/**
 * Pay by link, from the quote page.
 *
 * The specialist chooses what is being paid and for how much; the customer
 * pays on the gateway's own page. Nothing here takes a card number, and a
 * link only shows as paid once the gateway has confirmed it to us directly.
 */

function money(currency: string, n: number) {
  return `${currency} ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function when(iso: string) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function CreateButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className="btn-primary disabled:opacity-60">
      {pending ? 'Asking the gateway…' : 'Create payment link'}
    </button>
  );
}

function Copy({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // Clipboard refused — the link is on screen to copy by hand.
        }
      }}
      className="text-xs font-bold text-teal-deep hover:underline"
    >
      {done ? 'Copied' : 'Copy link'}
    </button>
  );
}

export default function PaymentLinks({
  quoteId,
  quoteRef,
  currency,
  configured,
  environment,
  links,
  payments,
  client,
  outstanding,
}: {
  quoteId: number;
  quoteRef: string;
  currency: string;
  /** False when the gateway credentials are not set on this deployment. */
  configured: boolean;
  environment: 'uat' | 'live' | null;
  links: PaymentLinkRow[];
  /** Unpaid instalments, so a link can be tied to one. */
  payments: Payment[];
  client: { name: string; email: string; phone: string };
  outstanding: number;
}) {
  const [state, formAction] = useFormState<LinkState, FormData>(createPaymentLinkAction, null);
  const unpaid = payments.filter((p) => !p.paidAt);
  const [amount, setAmount] = useState(() => (unpaid[0]?.amount ?? outstanding ?? 0).toFixed(2));

  return (
    <div className="rounded-2xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-ink">Payment link</h2>
          <p className="mt-1 text-sm text-ink-soft">
            The customer pays on the gateway’s own page. No card details reach us, and a link shows as paid only once
            the gateway confirms it.
          </p>
        </div>
        {environment === 'uat' && (
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
            Test gateway
          </span>
        )}
      </div>

      {!configured ? (
        <p className="mt-4 rounded-lg bg-sand px-4 py-3 text-sm text-ink-soft">
          The gateway is not configured on this deployment. Add the Mswipe credentials in Vercel — see{' '}
          <code className="font-mono text-xs">docs/mswipe.md</code>.
        </p>
      ) : (
        <form action={formAction} className="mt-5">
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="customer_name" value={client.name} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="pl-payment">What is being paid</label>
              <select
                id="pl-payment"
                name="payment_id"
                className="field"
                onChange={(e) => {
                  const row = unpaid.find((p) => String(p.id) === e.target.value);
                  if (row) setAmount(row.amount.toFixed(2));
                }}
              >
                {unpaid.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label || 'Instalment'} — {money(currency, p.amount)}
                  </option>
                ))}
                <option value="">Something else on this quote</option>
              </select>
              <p className="mt-1 text-xs text-ink-soft">
                Choosing an instalment marks it paid automatically when the money arrives.
              </p>
            </div>

            <div>
              <label className="field-label" htmlFor="pl-amount">Amount ({currency})</label>
              <input
                id="pl-amount"
                name="amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="field"
              />
              <p className="mt-1 text-xs text-ink-soft">Outstanding on this quote: {money(currency, outstanding)}</p>
            </div>

            <div>
              <label className="field-label" htmlFor="pl-email">Customer email</label>
              <input id="pl-email" name="customer_email" type="email" defaultValue={client.email} className="field" />
            </div>

            <div>
              <label className="field-label" htmlFor="pl-mobile">Customer mobile</label>
              <input id="pl-mobile" name="customer_mobile" defaultValue={client.phone} className="field" />
            </div>

            <div>
              <label className="field-label" htmlFor="pl-validity">Link valid for (hours)</label>
              <input id="pl-validity" name="validity_hours" type="number" min={1} max={168} defaultValue={48} className="field" />
            </div>
          </div>

          {state && (
            <p className={`mt-4 rounded-lg px-4 py-3 text-sm ${state.ok ? 'bg-teal/10 text-teal-deep' : 'bg-red-50 text-danger'}`}>
              {state.message}
              {state.url && (
                <>
                  <br />
                  <a href={state.url} target="_blank" rel="noopener" className="break-all font-mono text-xs underline">
                    {state.url}
                  </a>
                </>
              )}
            </p>
          )}

          <div className="mt-4">
            <CreateButton disabled={!configured} />
          </div>
        </form>
      )}

      {links.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="font-serif text-lg text-ink">Links on this quote</h3>
          <ul className="mt-3 space-y-3">
            {links.map((l) => (
              <li key={l.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {money(l.currency, l.amount)}
                      <span className="ml-2 font-normal text-ink-soft">{l.invoiceId}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      Created {when(l.createdAt)}
                      {l.createdBy ? ` by ${l.createdBy}` : ''}
                      {l.expiresAt ? ` · valid until ${when(l.expiresAt)}` : ''}
                    </p>
                    {l.url && (
                      <p className="mt-1 break-all font-mono text-[11px] text-ink-soft">{l.url}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      l.status === 'paid' ? 'bg-teal text-white' : 'bg-sand text-ink-soft'
                    }`}
                  >
                    {l.status === 'paid' ? 'Paid' : 'Awaiting payment'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  {l.url && <Copy url={l.url} />}
                  {l.status !== 'paid' && (
                    <form action={verifyPaymentLinkAction}>
                      <input type="hidden" name="link_id" value={l.id} />
                      <input type="hidden" name="quote_id" value={quoteId} />
                      <button type="submit" className="text-xs font-bold text-teal-deep hover:underline">
                        Check with the gateway
                      </button>
                    </form>
                  )}
                  <span className="text-xs text-ink-soft">
                    {l.status === 'paid'
                      ? `Confirmed ${when(l.verifiedAt || l.paidAt)}${l.gatewayPaymentId ? ` · ${l.gatewayPaymentId}` : ''}`
                      : l.lastCheckedAt
                        ? `Last checked ${when(l.lastCheckedAt)}`
                        : 'Not checked yet'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            Paid links mark their instalment on the schedule above. If a customer says they have paid and the status
            here still says otherwise, use “Check with the gateway” — that asks Mswipe directly rather than trusting
            anything sent to us.
          </p>
        </div>
      )}
    </div>
  );
}
