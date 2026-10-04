/**
 * The workspace's rules, as pure functions over a Snapshot.
 *
 * Kept free of I/O so the same decisions are made on the server (actions
 * re-check every one) and shown on the page, and so they are unit-tested.
 * State is derived from the records rather than stored: a trip's stage is what
 * its offers, approvals and bookings say it is, so it cannot drift.
 */
import { formatMoney, type Approval, type Booking, type Member, type Offer, type Role, type Snapshot, type Trip } from './types';

export const hasRole = (m: Member | null | undefined, role: Role) =>
  !!m && m.active && (m.roles.includes(role) || m.roles.includes('admin'));

/** Who sees whose trips: travellers their own; arrangers, approvers, finance and admins all of them. */
export const seesAllTrips = (m: Member) =>
  hasRole(m, 'arranger') || hasRole(m, 'approver') || hasRole(m, 'finance');

export const visibleTrips = (s: Snapshot, me: Member) =>
  seesAllTrips(me) ? s.trips : s.trips.filter((t) => t.travellerMemberId === me.id || t.requestedByMemberId === me.id);

/** An offer can still be chosen: not withdrawn, not expired. */
export const isOfferLive = (o: Offer, now: Date) => !o.withdrawnAt && new Date(o.expiresAt).getTime() > now.getTime();

/**
 * The approval that currently authorises a trip, if any: approved, and its
 * offer not since withdrawn (withdrawing is how a trip goes back for
 * re-approval after a price change).
 */
export function currentApproval(s: Snapshot, tripId: string): Approval | null {
  const withdrawn = new Set(s.offers.filter((o) => o.tripId === tripId && o.withdrawnAt).map((o) => o.id));
  return (
    s.approvals
      .filter((a) => a.tripId === tripId && a.decision === 'approved' && !withdrawn.has(a.offerId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}

export const activeBookings = (s: Snapshot, tripId: string): Booking[] =>
  s.bookings.filter((b) => b.tripId === tripId && b.status === 'confirmed');

export type Stage = 'cancelled' | 'requested' | 'options' | 'approved' | 'booked' | 'travelled';

export const STAGE_LABELS: Record<Stage, string> = {
  cancelled: 'Cancelled',
  requested: 'Finding options',
  options: 'Awaiting approval',
  approved: 'Approved — booking',
  booked: 'Booked',
  travelled: 'Travelled',
};

export function tripStage(s: Snapshot, trip: Trip, now: Date): Stage {
  if (trip.cancelledAt) return 'cancelled';
  if (activeBookings(s, trip.id).length > 0) {
    const end = new Date(`${trip.returnOn ?? trip.departOn}T23:59:59Z`);
    return end.getTime() < now.getTime() ? 'travelled' : 'booked';
  }
  if (currentApproval(s, trip.id)) return 'approved';
  const live = s.offers.some((o) => o.tripId === trip.id && isOfferLive(o, now));
  return live ? 'options' : 'requested';
}

export type Decision = { ok: true } | { ok: false; reason: string };

/**
 * May this member approve this offer now? Every check the server makes before
 * it writes an approval, in the order a person would want to hear them.
 */
export function canApprove(s: Snapshot, me: Member, offer: Offer, now: Date): Decision {
  const trip = s.trips.find((t) => t.id === offer.tripId);
  if (!trip) return { ok: false, reason: 'That trip is not in your programme.' };
  if (!hasRole(me, 'approver')) return { ok: false, reason: 'You are not set up as an approver.' };
  if (trip.travellerMemberId === me.id) return { ok: false, reason: 'You cannot approve your own trip.' };
  if (trip.cancelledAt) return { ok: false, reason: 'This trip has been cancelled.' };
  if (offer.withdrawnAt) return { ok: false, reason: 'This option has been withdrawn.' };
  if (new Date(offer.expiresAt).getTime() <= now.getTime())
    return { ok: false, reason: 'This option has expired. Ask your account team to requote.' };
  if (s.approvals.some((a) => a.offerId === offer.id)) return { ok: false, reason: 'This option has already been decided.' };
  if (currentApproval(s, trip.id)) return { ok: false, reason: 'Another option for this trip is already approved.' };
  if (me.approvalLimitMinor !== null && offer.totalMinor > me.approvalLimitMinor)
    return { ok: false, reason: 'This is above your approval limit.' };
  return { ok: true };
}

/** The most a trip may be booked for under its approval: the approved amount plus the company's tolerance. */
export const bookingCeiling = (approval: Approval, toleranceBps: number) =>
  approval.amountMinor + Math.floor((approval.amountMinor * toleranceBps) / 10000);

/**
 * May staff record a booking of this amount against the trip? Refused without
 * a current approval, or when it would take the trip's confirmed bookings over
 * the approved amount plus tolerance — the old authorisation no longer covers
 * the price, so the trip goes back for approval.
 */
export function canBook(s: Snapshot, tripId: string, amountMinor: number): Decision {
  const trip = s.trips.find((t) => t.id === tripId);
  if (!trip) return { ok: false, reason: 'Trip not found.' };
  if (trip.cancelledAt) return { ok: false, reason: 'The trip is cancelled.' };
  const approval = currentApproval(s, tripId);
  if (!approval) return { ok: false, reason: 'The trip has no current approval.' };
  const already = activeBookings(s, tripId).reduce((n, b) => n + b.amountMinor, 0);
  const ceiling = bookingCeiling(approval, s.company.priceToleranceBps);
  if (already + amountMinor > ceiling)
    return {
      ok: false,
      reason: `This would take the trip to ${formatMoney(already + amountMinor, approval.currency)}, above the approved ceiling of ${formatMoney(ceiling, approval.currency)}. Withdraw the approved option and send a new revision for approval.`,
    };
  return { ok: true };
}

/** Days until a date (UTC days; negative once past). */
export const daysUntil = (isoDate: string, now: Date) =>
  Math.floor((new Date(`${isoDate}T00:00:00Z`).getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000);
