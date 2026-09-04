import {
  cancelSupplierBooking,
  confirmSupplierBooking,
  emailVoucher,
  recheckSupplierRate,
  refreshSupplierOffer,
} from '@/lib/admin/supplier-booking-actions';

function when(iso?: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function money(n: number | null | undefined, currency: string) {
  if (n == null) return '';
  return `${currency} ${Math.round(Number(n)).toLocaleString('en-GB')}`;
}

/**
 * Confirming, vouchering and cancelling a request with Hotelbeds — the
 * specialist's controls on the request page. Everything here is a form
 * that posts to a server action; nothing books on page load.
 */
export default function SupplierBookingPanel({ r, note }: { r: any; note?: string }) {
  const confirmed = Boolean(r.supplier_reference);
  const cancelled = Boolean(r.supplier_cancelled_at);
  const recheck = r.supplier_recheck ?? null;
  const holderGuess = String(r.holder_name ?? '') || String(r.name ?? '').trim().split(/\s+/).slice(0, -1).join(' ') || String(r.name ?? '').trim();
  const surnameGuess = String(r.holder_surname ?? '') || String(r.name ?? '').trim().split(/\s+/).slice(1).pop() || '';
  const ages: number[] = Array.isArray(r.children_ages) ? r.children_ages : [];
  const booking = r.supplier_booking ?? null;

  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-ink">Hotelbeds</h2>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
            cancelled ? 'bg-sand text-ink-soft' : confirmed ? 'bg-teal text-white' : 'bg-sand text-ink-soft'
          }`}
        >
          {cancelled ? 'Cancelled' : confirmed ? r.supplier_status || 'Confirmed' : 'Not booked'}
        </span>
      </div>

      {note && (
        <p className="mt-3 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-ink">{note}</p>
      )}

      {!confirmed && (
        <>
          <div className="mt-4 rounded-xl bg-sand p-4 text-sm">
            <p className="text-ink">
              <strong>{r.room_name}</strong>
              {r.board ? ` · ${r.board}` : ''} · {money(r.amount, r.currency)}
              {r.net_amount ? <span className="text-ink-soft"> (net {money(r.net_amount, r.currency)})</span> : null}
            </p>
            {recheck ? (
              <p className="mt-1 text-xs text-ink-soft">
                Last {recheck.source === 'checkrate' ? 're-check' : 'search'} {when(recheck.at)}: {money(recheck.total, recheck.currency)} ·{' '}
                {recheck.rateType === 'RECHECK' ? 'RECHECK rate — must be re-checked before confirming' : 'bookable as quoted'}
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-soft">
                Quoted {when(r.created_at)}. Rate keys expire after some hours — if Hotelbeds refuses, search again below.
              </p>
            )}
            {r.rate_comments && (
              <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink">
                <strong>Rate comments (customer has seen these):</strong> {r.rate_comments}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={recheckSupplierRate}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="btn-outline !bg-white !px-4 !py-2 text-xs">Re-check this rate</button>
              </form>
              <form action={refreshSupplierOffer}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="btn-outline !bg-white !px-4 !py-2 text-xs">Search again for this room</button>
              </form>
            </div>
          </div>

          <form action={confirmSupplierBooking} className="mt-5">
            <input type="hidden" name="id" value={r.id} />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Lead guest, as in the passport</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <input name="holder_name" required defaultValue={holderGuess} placeholder="First name(s)" className="field" />
              <input name="holder_surname" required defaultValue={surnameGuess} placeholder="Surname" className="field" />
            </div>

            {Number(r.adults) > 1 && (
              <>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Other adults (optional)</p>
                {Array.from({ length: Number(r.adults) - 1 }, (_, i) => i + 2).map((i) => (
                  <div key={i} className="mt-2 grid gap-3 sm:grid-cols-2">
                    <input name={`ad${i}_name`} placeholder={`Adult ${i} first name`} className="field" />
                    <input name={`ad${i}_surname`} placeholder={`Adult ${i} surname`} className="field" />
                  </div>
                ))}
              </>
            )}

            {Number(r.children) > 0 && (
              <>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Children — ages are mandatory</p>
                {Array.from({ length: Number(r.children) }, (_, i) => i + 1).map((i) => (
                  <div key={i} className="mt-2 grid gap-3 sm:grid-cols-[1fr_1fr_110px]">
                    <input name={`ch${i}_name`} placeholder={`Child ${i} first name`} className="field" />
                    <input name={`ch${i}_surname`} placeholder="Surname (defaults to lead guest)" className="field" />
                    <input name={`ch${i}_age`} type="number" min={0} max={17} required defaultValue={ages[i - 1] ?? ''} placeholder="Age" className="field" />
                  </div>
                ))}
              </>
            )}

            <div className="mt-4">
              <label className="field-label">Remark to the hotel (optional)</label>
              <textarea name="remark" rows={2} className="field" placeholder="Honeymoon, late arrival, connecting rooms requested…" defaultValue={r.supplier_remark ?? ''} />
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" name="agreed" value="yes" required className="mt-1" />
              <span>
                The customer has agreed the price of <strong>{money(r.amount, r.currency)}</strong>, the cancellation terms and the
                rate comments, and payment is arranged.
              </span>
            </label>

            <button type="submit" className="btn-primary mt-4 !px-6">Confirm with Hotelbeds</button>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Books the rate key above with a 2% price tolerance, stores Hotelbeds’ reply on this request and emails the voucher
              to {r.email}. In the live environment this is a real booking with real cancellation terms.
            </p>
          </form>
        </>
      )}

      {confirmed && (
        <div className="mt-4 space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-sand p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Hotelbeds reference</p>
              <p className="mt-1 font-serif text-2xl text-ink">{r.supplier_reference}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {booking?.status ?? r.supplier_status} · confirmed {when(r.supplier_confirmed_at)} · our ref PCS-{r.id}
              </p>
            </div>
            <div className="rounded-xl bg-sand p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Supplier cost</p>
              <p className="mt-1 font-serif text-2xl text-ink">
                {booking ? `${booking.currency} ${Number(booking.totalNet).toLocaleString('en-GB')}` : money(r.net_amount, r.currency)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {booking?.hotel?.supplier?.name ? `Payable through ${booking.hotel.supplier.name}` : 'Supplier not named in the reply'}
                {booking?.hotel?.supplier?.vatNumber ? ` · VAT ${booking.hotel.supplier.vatNumber}` : ''}
              </p>
            </div>
          </div>

          <div>
            <p className="text-ink">
              <strong>{`${r.holder_name ?? ''} ${r.holder_surname ?? ''}`.trim()}</strong>
              {Array.isArray(r.paxes) && r.paxes.length > 1
                ? ` + ${r.paxes.length - 1} more`
                : ''}{' '}
              · {booking?.hotel?.checkIn ?? r.check_in} → {booking?.hotel?.checkOut ?? ''} · {booking?.hotel?.rooms?.[0]?.name ?? r.room_name}
            </p>
            {r.rate_comments && (
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
                <strong>On the voucher:</strong> {r.rate_comments}
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

          {!cancelled ? (
            <form action={cancelSupplierBooking} className="rounded-xl border border-danger/40 p-4">
              <input type="hidden" name="id" value={r.id} />
              <p className="text-sm font-semibold text-danger">Cancel with Hotelbeds</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {r.refundable === false
                  ? 'This rate is non-refundable — the supplier will charge the full amount.'
                  : r.cancel_by
                    ? `Free cancellation until ${String(r.cancel_by).slice(0, 16).replace('T', ' ')} hotel time; charges apply after.`
                    : 'Check the cancellation terms before you do this.'}
              </p>
              <label className="mt-3 flex items-start gap-2 text-sm text-ink">
                <input type="checkbox" name="confirm" value="yes" required className="mt-1" />
                <span>Cancel booking {r.supplier_reference} with Hotelbeds now.</span>
              </label>
              <button type="submit" className="btn-outline mt-3 !border-danger !px-4 !py-2 text-xs !text-danger">
                Cancel booking
              </button>
            </form>
          ) : (
            <p className="rounded-xl bg-sand p-4 text-sm text-ink">
              Cancelled {when(r.supplier_cancelled_at)}.
              {r.cancellation_cost != null ? ` Supplier charge: ${money(r.cancellation_cost, r.currency)}.` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
