/**
 * The management-budget lifecycle, computed from the records.
 *
 * Every amount sits in exactly one bucket, so nothing is counted twice:
 *   incurred  — invoiced, net of credit notes (the money that is real)
 *   committed — confirmed bookings not yet invoiced (the part of each booking
 *               an invoice does not yet cover)
 *   reserved  — approved trips with nothing booked yet (the approved amount)
 *   proposed  — trips awaiting a decision (the cheapest live option); a
 *               forecast, never deducted from the budget
 * Refund claims and airline credits are reported beside the budget, never
 * deducted from spend: a refund reduces cost only when a credit note arrives.
 *
 * All amounts are in the company's billing currency; records in any other
 * currency are left out and counted in `excluded`, so a gap is visible rather
 * than silently converted.
 */
import { activeBookings, currentApproval, isOfferLive } from './rules';
import type { CostCentre, Snapshot, Trip } from './types';

export type Lifecycle = {
  incurred: number;
  committed: number;
  reserved: number;
  proposed: number;
  excluded: number;
};

const zero = (): Lifecycle => ({ incurred: 0, committed: 0, reserved: 0, proposed: 0, excluded: 0 });

export function tripLifecycle(s: Snapshot, trip: Trip, now: Date): Lifecycle {
  const cur = s.company.billingCurrency;
  const out = zero();

  const invoices = s.invoices.filter((i) => i.tripId === trip.id);
  for (const inv of invoices) {
    if (inv.currency !== cur) { out.excluded += 1; continue; }
    out.incurred += inv.kind === 'credit_note' ? -inv.amountMinor : inv.amountMinor;
  }

  const bookings = activeBookings(s, trip.id);
  for (const b of bookings) {
    if (b.currency !== cur) { out.excluded += 1; continue; }
    const invoiced = invoices
      .filter((i) => i.bookingId === b.id && i.currency === cur)
      .reduce((n, i) => n + (i.kind === 'credit_note' ? -i.amountMinor : i.amountMinor), 0);
    out.committed += Math.max(0, b.amountMinor - invoiced);
  }

  if (trip.cancelledAt) return { ...out, committed: 0 };
  if (bookings.length > 0) return out;

  const approval = currentApproval(s, trip.id);
  if (approval) {
    if (approval.currency === cur) out.reserved += approval.amountMinor;
    else out.excluded += 1;
    return out;
  }

  const live = s.offers.filter((o) => o.tripId === trip.id && isOfferLive(o, now) && o.currency === cur);
  if (live.length) out.proposed += Math.min(...live.map((o) => o.totalMinor));
  return out;
}

export type CentreBudget = Lifecycle & {
  centre: CostCentre;
  budget: number | null;
  /** budget − incurred − committed − reserved; null without a budget. */
  remaining: number | null;
  /** remaining − proposed: what is left if everything awaiting approval goes ahead. */
  remainingIfApproved: number | null;
};

export function centreBudgets(s: Snapshot, now: Date): CentreBudget[] {
  return s.costCentres.map((centre) => {
    const total = zero();
    for (const t of s.trips.filter((t) => t.costCentreId === centre.id)) {
      const l = tripLifecycle(s, t, now);
      total.incurred += l.incurred;
      total.committed += l.committed;
      total.reserved += l.reserved;
      total.proposed += l.proposed;
      total.excluded += l.excluded;
    }
    const budget = centre.budgetMinor;
    const remaining = budget === null ? null : budget - total.incurred - total.committed - total.reserved;
    return {
      ...total,
      centre,
      budget,
      remaining,
      remainingIfApproved: remaining === null ? null : remaining - total.proposed,
    };
  });
}

/** Trips with no cost centre still cost money: their lifecycle, summed. */
export function uncodedLifecycle(s: Snapshot, now: Date): Lifecycle & { trips: number } {
  const total = { ...zero(), trips: 0 };
  for (const t of s.trips.filter((t) => !t.costCentreId)) {
    const l = tripLifecycle(s, t, now);
    total.incurred += l.incurred;
    total.committed += l.committed;
    total.reserved += l.reserved;
    total.proposed += l.proposed;
    total.excluded += l.excluded;
    total.trips += 1;
  }
  return total;
}

/**
 * Open finance items: what the monthly pack has to resolve, each with an
 * owner. Bookings without an invoice once travel has happened, invoices in
 * dispute, refunds not yet received, credits expiring within 60 days.
 */
export type OpenItem = { kind: string; label: string; amountMinor: number | null; owner: 'Premium Choice' | 'Client' | 'Supplier'; tripId: string | null };

export function openItems(s: Snapshot, now: Date): OpenItem[] {
  const items: OpenItem[] = [];
  const today = now.toISOString().slice(0, 10);
  for (const b of s.bookings.filter((b) => b.status === 'confirmed')) {
    const trip = s.trips.find((t) => t.id === b.tripId);
    if (!trip) continue;
    const ended = (trip.returnOn ?? trip.departOn) < today;
    const invoiced = s.invoices.some((i) => i.bookingId === b.id && i.kind === 'invoice');
    if (ended && !invoiced)
      items.push({ kind: 'Missing invoice', label: `${trip.ref} · ${b.description}`, amountMinor: b.amountMinor, owner: 'Premium Choice', tripId: trip.id });
  }
  for (const i of s.invoices.filter((i) => i.status === 'disputed'))
    items.push({ kind: 'Disputed', label: `${i.kind === 'invoice' ? 'Invoice' : 'Credit note'} ${i.number}`, amountMinor: i.amountMinor, owner: 'Premium Choice', tripId: i.tripId });
  for (const r of s.refunds.filter((r) => r.status === 'claimed' || r.status === 'authorised'))
    items.push({ kind: r.status === 'claimed' ? 'Refund claimed' : 'Refund authorised', label: `${r.supplier}${r.note ? ` · ${r.note}` : ''}`, amountMinor: r.amountMinor, owner: 'Supplier', tripId: r.tripId });
  for (const c of s.credits.filter((c) => c.status === 'available')) {
    const days = Math.floor((new Date(`${c.expiresOn}T00:00:00Z`).getTime() - now.getTime()) / 86400000);
    if (days <= 60)
      items.push({ kind: days < 0 ? 'Credit expired' : `Credit expires in ${days} days`, label: `${c.airline} · ticket ${c.ticketNumber}`, amountMinor: c.amountMinor, owner: 'Premium Choice', tripId: null });
  }
  return items;
}
