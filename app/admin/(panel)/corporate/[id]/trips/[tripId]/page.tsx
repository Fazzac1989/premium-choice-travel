import { randomUUID } from 'crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, Details, Field, Flash, Scope } from '@/components/corporate/workspace/admin-bits';
import { tripLifecycle } from '@/lib/corporate/workspace/budget';
import { loadSnapshot } from '@/lib/corporate/workspace/repo';
import { bookingCeiling, currentApproval, isOfferLive, STAGE_LABELS, tripStage } from '@/lib/corporate/workspace/rules';
import {
  addOffer, addRefundClaim, cancelBooking, cancelTrip, recordBooking, recordInvoice, withdrawOffer,
} from '@/lib/corporate/workspace/staff-actions';
import { BOOKING_KINDS, formatMoney } from '@/lib/corporate/workspace/types';

export const dynamic = 'force-dynamic';

/** One trip, from the operations side: options out, approval in, bookings, documents, money. */
export default async function CorporateTripOpsPage({
  params,
  searchParams,
}: {
  params: { id: string; tripId: string };
  searchParams: { ok?: string; error?: string };
}) {
  if (!/^[0-9a-f-]{36}$/.test(params.id) || !/^[0-9a-f-]{36}$/.test(params.tripId)) notFound();
  const s = await loadSnapshot(params.id).catch(() => null);
  const trip = s?.trips.find((t) => t.id === params.tripId);
  if (!s || !trip) notFound();
  const now = new Date();
  const back = `/admin/corporate/${s.company.id}/trips/${trip.id}`;
  const scope = <Scope company={s.company.id} back={back} />;
  const name = (id: string | null) => s.members.find((m) => m.id === id)?.fullName ?? '—';
  const offers = s.offers.filter((o) => o.tripId === trip.id).sort((a, b) => a.revision - b.revision);
  const approval = currentApproval(s, trip.id);
  const bookings = s.bookings.filter((b) => b.tripId === trip.id);
  const invoices = s.invoices.filter((i) => i.tripId === trip.id);
  const life = tripLifecycle(s, trip, now);
  const booked = bookings.filter((b) => b.status === 'confirmed').reduce((n, b) => n + b.amountMinor, 0);
  const ceiling = approval ? bookingCeiling(approval, s.company.priceToleranceBps) : null;
  // Default price expiry: 48 hours from now, in the browser's datetime-local format.
  const defaultExpiry = new Date(now.getTime() + 48 * 3600 * 1000 + 4 * 3600 * 1000).toISOString().slice(0, 16);

  return (
    <>
      <Link href={`/admin/corporate/${s.company.id}`} className="text-sm font-semibold text-teal-deep hover:underline">← {s.company.name}</Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">{trip.ref} · {trip.origin} → {trip.destination}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {name(trip.travellerMemberId)} · {trip.departOn}{trip.returnOn ? ` – ${trip.returnOn}` : ''} · {trip.purpose} ·{' '}
        {s.costCentres.find((c) => c.id === trip.costCentreId)?.code ?? 'not coded'} · <strong>{STAGE_LABELS[tripStage(s, trip, now)]}</strong>
      </p>
      {trip.notes && <p className="mt-2 max-w-3xl rounded-lg bg-sand px-4 py-2 text-sm text-ink">“{trip.notes}”</p>}
      <Flash ok={searchParams.ok} error={searchParams.error} />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Options">
          <ul className="space-y-3">
            {offers.map((o) => {
              const decision = s.approvals.find((a) => a.offerId === o.id);
              return (
                <li key={o.id} className="rounded-lg border border-line p-3 text-sm">
                  <p className="font-semibold text-ink">#{o.revision} {o.label} · {formatMoney(o.totalMinor, o.currency)}</p>
                  <p className="mt-1 text-ink-soft">{o.details}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Expires {new Date(o.expiresAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })} · policy v{o.policyVersion ?? '—'}{o.inPolicy ? '' : ' · OUTSIDE POLICY'}
                    {o.withdrawnAt ? ' · WITHDRAWN' : !isOfferLive(o, now) && !decision ? ' · EXPIRED' : ''}
                    {decision ? ` · ${decision.decision} by ${name(decision.approverMemberId)}${decision.comment ? ` — “${decision.comment}”` : ''}` : ''}
                  </p>
                  {!o.withdrawnAt && (
                    <form action={withdrawOffer} className="mt-2">
                      {scope}
                      <input type="hidden" name="offer" value={o.id} />
                      <button className="text-xs font-semibold text-danger hover:underline">Withdraw{decision?.decision === 'approved' ? ' (sends the trip back for approval)' : ''}</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {!offers.length && <p className="text-sm text-ink-soft">No options sent yet.</p>}
          {!trip.cancelledAt && (
            <Details summary="Send an option">
              <form action={addOffer} className="grid gap-3 sm:grid-cols-2">
                {scope}
                <input type="hidden" name="trip" value={trip.id} />
                <Field label="Short name" className="sm:col-span-2"><input name="label" required className="field" placeholder="Emirates + Kempinski Nile" /></Field>
                <Field label="Details" className="sm:col-span-2"><textarea name="details" rows={3} required className="field" placeholder="Flights, times, cabin, hotel, nights, board" /></Field>
                <Field label="All-in total (AED)"><input name="total" required className="field" /></Field>
                <Field label="Price valid until"><input name="expires_at" type="datetime-local" required defaultValue={defaultExpiry} className="field" /></Field>
                <Field label="Change terms"><input name="change_terms" className="field" /></Field>
                <Field label="Refund terms"><input name="refund_terms" className="field" /></Field>
                <Field label="Policy note / why we recommend it" className="sm:col-span-2"><input name="policy_note" className="field" /></Field>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="in_policy" defaultChecked /> Within policy</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="recommended" /> Recommended</label>
                <button className="btn-primary sm:col-span-2">Send to client for approval</button>
              </form>
            </Details>
          )}
        </Card>

        <Card title="Bookings">
          {approval ? (
            <p className="text-sm text-ink">
              Approved {formatMoney(approval.amountMinor)} by {name(approval.approverMemberId)}. Booked so far {formatMoney(booked)}; ceiling with tolerance {formatMoney(ceiling!)}.
            </p>
          ) : (
            <p className="text-sm text-ink-soft">No current approval — nothing can be booked.</p>
          )}
          <ul className="mt-3 space-y-2 text-sm">
            {bookings.map((b) => (
              <li key={b.id} className="rounded-lg border border-line p-3">
                <p><strong className="capitalize">{b.kind}</strong> · {b.supplier} {b.supplierRef} · {b.description} · {formatMoney(b.amountMinor)} · <strong>{b.status}</strong>{b.cancelSupplierRef ? ` (${b.cancelSupplierRef})` : ''}</p>
                {b.status === 'confirmed' && (
                  <div className="mt-2 flex flex-wrap gap-4">
                    <form action={cancelBooking} className="flex flex-wrap items-center gap-2">
                      {scope}
                      <input type="hidden" name="booking" value={b.id} />
                      <input name="cancel_ref" className="field !w-40 !py-1.5" placeholder="Supplier cancel ref" />
                      <input name="penalty" className="field !w-28 !py-1.5" placeholder="Charge AED" />
                      <button className="btn-outline !px-3 !py-1.5 text-xs">Cancel booking</button>
                    </form>
                  </div>
                )}
                <form action={addRefundClaim} className="mt-2 flex flex-wrap items-center gap-2">
                  {scope}
                  <input type="hidden" name="booking" value={b.id} />
                  <input name="amount" className="field !w-28 !py-1.5" placeholder="AED" />
                  <input name="note" className="field !w-48 !py-1.5" placeholder="e.g. Fare less penalty" />
                  <button className="btn-outline !px-3 !py-1.5 text-xs">Open refund claim</button>
                </form>
              </li>
            ))}
          </ul>
          {approval && !trip.cancelledAt && (
            <Details summary="Record a confirmed booking">
              <form action={recordBooking} className="grid gap-3 sm:grid-cols-2">
                {scope}
                <input type="hidden" name="trip" value={trip.id} />
                {/* One id per rendered form: a double submit is recognised, not booked twice. */}
                <input type="hidden" name="action_id" value={randomUUID()} />
                <Field label="What"><select name="kind" className="field">{BOOKING_KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
                <Field label="Supplier"><input name="supplier" required className="field" /></Field>
                <Field label="Supplier confirmation / PNR"><input name="supplier_ref" required className="field" /></Field>
                <Field label="Amount (AED)"><input name="amount" required className="field" /></Field>
                <Field label="Description" className="sm:col-span-2"><input name="description" required className="field" placeholder="DXB–CAI return, economy flex" /></Field>
                <Field label="Supplier currency (if not AED)"><input name="source_currency" maxLength={3} className="field" placeholder="SAR" /></Field>
                <Field label="Supplier amount"><input name="source_amount" className="field" /></Field>
                <Field label="Rate used"><input name="fx_rate" className="field" placeholder="0.979" /></Field>
                <p className="text-xs text-ink-soft sm:col-span-2">Recheck price and availability first. Only record what the supplier has confirmed.</p>
                <button className="btn-primary sm:col-span-2">Record booking</button>
              </form>
            </Details>
          )}
        </Card>

        <Card title="Invoices and credit notes">
          <p className="text-sm text-ink">
            Invoiced net {formatMoney(life.incurred)} · booked not invoiced {formatMoney(life.committed)} · approved not booked {formatMoney(life.reserved)}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {invoices.map((i) => <li key={i.id}>{i.kind === 'invoice' ? 'Invoice' : 'Credit note'} {i.number} · {i.issuedOn} · {formatMoney(i.amountMinor)} · {i.status}</li>)}
          </ul>
          <Details summary="Record an invoice or credit note">
            <form action={recordInvoice} className="grid gap-3 sm:grid-cols-2">
              {scope}
              <input type="hidden" name="trip" value={trip.id} />
              <Field label="Type"><select name="kind" className="field"><option value="invoice">Invoice</option><option value="credit_note">Credit note</option></select></Field>
              <Field label="For booking"><select name="booking" className="field"><option value="">Whole trip</option>{bookings.map((b) => <option key={b.id} value={b.id}>{b.supplier} {b.supplierRef}</option>)}</select></Field>
              <Field label="Number"><input name="number" required className="field" /></Field>
              <Field label="Date"><input name="issued_on" type="date" required defaultValue={now.toISOString().slice(0, 10)} className="field" /></Field>
              <Field label="Amount (AED, before VAT)"><input name="amount" required className="field" /></Field>
              <Field label="VAT (AED)"><input name="tax" className="field" placeholder="0" /></Field>
              <button className="btn-primary sm:col-span-2">Record</button>
            </form>
          </Details>
        </Card>

        <Card title="Trip">
          {trip.cancelledAt ? (
            <p className="text-sm text-ink">Cancelled {trip.cancelledAt.slice(0, 10)} — {trip.cancelReason}</p>
          ) : (
            <form action={cancelTrip} className="flex flex-wrap items-end gap-2">
              {scope}
              <input type="hidden" name="trip" value={trip.id} />
              <Field label="Cancel the trip — reason"><input name="reason" className="field !w-72" /></Field>
              <button className="btn-outline !px-4 !py-2.5 text-sm">Cancel trip</button>
              <p className="w-full text-xs text-ink-soft">Every confirmed booking must be cancelled with its supplier first.</p>
            </form>
          )}
          <h3 className="mt-5 text-sm font-bold text-ink">Activity</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {s.audit.filter((e) => e.tripId === trip.id).map((e) => (
              <li key={e.id}><span className="text-ink-soft">{new Date(e.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })}</span> · <strong>{e.actorLabel}</strong> · {e.action}</li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
