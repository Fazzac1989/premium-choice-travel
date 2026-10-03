import {
  checkBookingPayment,
  createBookingPaymentLink,
  emailVoucher,
  resendPaymentLink,
} from '@/lib/admin/booking-actions';
import type { PaymentLinkRow } from '@/lib/payments/links-core';
import CopyButton from '@/components/admin/CopyButton';

function when(iso?: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function money(n: number | null | undefined, currency: string) {
  if (n == null) return '';
  return `${currency} ${Math.round(Number(n)).toLocaleString('en-GB')}`;
}

/**
 * The booking on the request page. A stay booked through the trade platform (founder,
 * 2026-10-02) was booked and paid by the customer and is looked after on the trade console;
 * this only shows where it stands. A request from before the platform keeps what a specialist
 * still needs: the payment link and the voucher.
 */
export default function BookingPanel({
  r,
  note,
  links = [],
  paymentsConfigured = false,
}: {
  r: any;
  note?: string;
  /** Payment links raised against this request, newest first. */
  links?: PaymentLinkRow[];
  paymentsConfigured?: boolean;
}) {
  const confirmed = Boolean(r.supplier_reference);
  const cancelled = Boolean(r.supplier_cancelled_at);
  const platform = r.provider === 'platform';

  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-ink">Booking</h2>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
            confirmed && !cancelled ? 'bg-teal text-white' : 'bg-sand text-ink-soft'
          }`}
        >
          {cancelled ? 'Cancelled' : confirmed ? 'Confirmed' : r.status === 'closed' ? 'Not booked' : 'In progress'}
        </span>
      </div>

      {note && (
        <p className="mt-3 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-ink">{note}</p>
      )}

      {platform ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-xl bg-sand p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Booking reference</p>
            <p className="mt-1 font-serif text-2xl text-ink">{r.supplier_reference ?? '—'}</p>
            <p className="mt-1 text-xs text-ink-soft">
              {confirmed
                ? `Booked and paid online ${when(r.supplier_confirmed_at)} · our ref PCS-${r.id}`
                : r.status === 'closed'
                  ? `Not booked: ${r.supplier_remark ?? 'the payment was not completed'}. Nothing was charged.`
                  : 'The customer has not finished paying, or the booking is being confirmed.'}
            </p>
          </div>
          {cancelled && (
            <p className="rounded-xl bg-sand p-4 text-ink">
              Cancelled by the customer {when(r.supplier_cancelled_at)}.
              {r.cancellation_cost != null ? ` Charge kept: ${money(r.cancellation_cost, r.currency)}.` : ''}
            </p>
          )}
          <p className="text-xs leading-relaxed text-ink-soft">
            Changes, cancellations and refunds for this stay are made on the trade console (Bookings, brand
            Staycations). The customer can also cancel it themselves from My trips while the hotel&apos;s terms allow.
          </p>
          {confirmed && (
            <a href={`/admin/requests/${r.id}/voucher`} className="btn-primary inline-block !px-4 !py-2 text-xs">
              Download voucher
            </a>
          )}
        </div>
      ) : !confirmed ? (
        <p className="mt-4 rounded-xl bg-sand p-4 text-sm text-ink">
          This request was made before stays were booked online, and nothing is booked for it. If the customer still
          wants it, ask them to book it on the site, or book it on the trade console.
        </p>
      ) : (
        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-xl bg-sand p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Supplier reference</p>
            <p className="mt-1 font-serif text-2xl text-ink">{r.supplier_reference}</p>
            <p className="mt-1 text-xs text-ink-soft">
              {r.supplier_status} · confirmed {when(r.supplier_confirmed_at)} · our ref PCS-{r.id}
            </p>
          </div>

          {/* Money. The voucher follows it, so this sits above the voucher. */}
          <div className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink">Payment</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  r.paid_at ? 'bg-teal text-white' : 'bg-sand text-ink-soft'
                }`}
              >
                {r.paid_at ? 'Paid' : 'Awaiting payment'}
              </span>
            </div>

            {r.paid_at ? (
              <p className="mt-2 text-sm text-ink-soft">Paid {when(r.paid_at)}.</p>
            ) : links.length > 0 ? (
              <div className="mt-3 space-y-3">
                {links.map((l) => (
                  <div key={l.id}>
                    <p className="text-sm text-ink">
                      {money(l.amount, l.currency)}
                      <span className="ml-2 text-xs text-ink-soft">
                        {l.invoiceId} · created {when(l.createdAt)}
                        {l.expiresAt ? ` · valid until ${when(l.expiresAt)}` : ''}
                      </span>
                    </p>
                    <p className="mt-1 break-all font-mono text-[10px] leading-relaxed text-ink-soft">{l.url}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <CopyButton text={l.url} className="text-xs font-bold text-teal-deep hover:underline" />
                      <form action={resendPaymentLink}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="link_id" value={l.id} />
                        <button type="submit" className="text-xs font-bold text-teal-deep hover:underline">Email it again</button>
                      </form>
                      <form action={checkBookingPayment}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="link_id" value={l.id} />
                        <button type="submit" className="text-xs font-bold text-teal-deep hover:underline">Check with the gateway</button>
                      </form>
                      <span className="text-xs text-ink-soft">
                        {l.lastCheckedAt ? `Last checked ${when(l.lastCheckedAt)}` : 'Not checked yet'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : paymentsConfigured ? (
              <form action={createBookingPaymentLink} className="mt-3">
                <input type="hidden" name="id" value={r.id} />
                <p className="text-sm text-ink-soft">
                  No payment link yet. Create one for {money(r.amount, r.currency)} and we will email it to {r.email}.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input name="link_hours" type="number" min={1} max={168} defaultValue={72} className="field !w-24 !py-1.5" />
                  <span className="text-xs text-ink-soft">hours valid</span>
                  <button type="submit" className="btn-outline !px-4 !py-2 text-xs">Create and email a payment link</button>
                </div>
              </form>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">
                The payment gateway is not configured here, so payment is arranged with the customer directly.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a href={`/admin/requests/${r.id}/voucher`} className="btn-primary !px-4 !py-2 text-xs">
              Download voucher
            </a>
            <form action={emailVoucher}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className="btn-outline !px-4 !py-2 text-xs">Email voucher to customer</button>
            </form>
            <span className="text-xs text-ink-soft">
              {r.voucher_sent_at ? `Last sent ${when(r.voucher_sent_at)}` : 'Not sent yet'}
            </span>
          </div>

          <p className="rounded-xl bg-sand p-4 text-sm text-ink">
            {cancelled
              ? `Cancelled ${when(r.supplier_cancelled_at)}.${r.cancellation_cost != null ? ` Supplier charge: ${money(r.cancellation_cost, r.currency)}.` : ''}`
              : 'Booked with the supplier directly before stays were booked online: cancel it with that supplier.'}
          </p>
        </div>
      )}
    </div>
  );
}
