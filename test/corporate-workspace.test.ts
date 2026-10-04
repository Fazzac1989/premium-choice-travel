import { describe, expect, it } from 'vitest';
import { demoSnapshot } from '@/lib/corporate/workspace/demo';
import { canApprove, canBook, currentApproval, tripStage, visibleTrips } from '@/lib/corporate/workspace/rules';
import { centreBudgets, openItems, tripLifecycle } from '@/lib/corporate/workspace/budget';
import { parseMoney, type Snapshot } from '@/lib/corporate/workspace/types';

const NOW = new Date('2026-10-04T10:00:00Z');
const snap = () => demoSnapshot(NOW);
const trip = (s: Snapshot, id: string) => s.trips.find((t) => t.id === id)!;
const member = (s: Snapshot, id: string) => s.members.find((m) => m.id === id)!;
const offer = (s: Snapshot, id: string) => s.offers.find((o) => o.id === id)!;

describe('trip stages come from the records', () => {
  it('derives every stage in the demo', () => {
    const s = snap();
    expect(tripStage(s, trip(s, 'demo-t1'), NOW)).toBe('travelled');
    expect(tripStage(s, trip(s, 'demo-t2'), NOW)).toBe('booked');
    expect(tripStage(s, trip(s, 'demo-t3'), NOW)).toBe('options');
    expect(tripStage(s, trip(s, 'demo-t4'), NOW)).toBe('approved');
    expect(tripStage(s, trip(s, 'demo-t5'), NOW)).toBe('requested');
    expect(tripStage(s, trip(s, 'demo-t6'), NOW)).toBe('cancelled');
  });

  it('sends a trip back for approval when its approved offer is withdrawn', () => {
    const s = snap();
    s.offers = s.offers.map((o) => (o.id === 'demo-o4' ? { ...o, withdrawnAt: NOW.toISOString() } : o));
    expect(currentApproval(s, 'demo-t4')).toBeNull();
    expect(tripStage(s, trip(s, 'demo-t4'), NOW)).toBe('requested');
  });
});

describe('approval', () => {
  it('lets an approver approve a live option within their limit', () => {
    const s = snap();
    expect(canApprove(s, member(s, 'demo-m-james'), offer(s, 'demo-o3a'), NOW)).toEqual({ ok: true });
  });

  it('refuses self-approval', () => {
    const s = snap();
    s.trips = s.trips.map((t) => (t.id === 'demo-t3' ? { ...t, travellerMemberId: 'demo-m-james' } : t));
    const d = canApprove(s, member(s, 'demo-m-james'), offer(s, 'demo-o3a'), NOW);
    expect(d.ok).toBe(false);
  });

  it('refuses someone who is not an approver', () => {
    const s = snap();
    expect(canApprove(s, member(s, 'demo-m-priya'), offer(s, 'demo-o3a'), NOW).ok).toBe(false);
  });

  it('refuses an expired option', () => {
    const s = snap();
    const later = new Date(NOW.getTime() + 5 * 86400000);
    expect(canApprove(s, member(s, 'demo-m-amal'), offer(s, 'demo-o3a'), later).ok).toBe(false);
  });

  it('refuses above the approver’s limit', () => {
    const s = snap();
    s.members = s.members.map((m) => (m.id === 'demo-m-james' ? { ...m, approvalLimitMinor: 100000 } : m));
    expect(canApprove(s, member(s, 'demo-m-james'), offer(s, 'demo-o3a'), NOW).ok).toBe(false);
  });

  it('refuses a second approval on the same trip', () => {
    const s = snap();
    s.approvals.push({ id: 'x', tripId: 'demo-t3', offerId: 'demo-o3b', approverMemberId: 'demo-m-amal', decision: 'approved', amountMinor: 318000, currency: 'AED', policyVersion: 3, comment: null, createdAt: NOW.toISOString() });
    expect(canApprove(s, member(s, 'demo-m-james'), offer(s, 'demo-o3a'), NOW).ok).toBe(false);
  });
});

describe('booking against an approval', () => {
  it('allows bookings up to the approved amount plus tolerance', () => {
    const s = snap(); // trip 4 approved at AED 8,740, tolerance 5% → ceiling 9,177
    expect(canBook(s, 'demo-t4', 917700).ok).toBe(true);
    expect(canBook(s, 'demo-t4', 917701).ok).toBe(false);
  });

  it('refuses a trip with no approval', () => {
    expect(canBook(snap(), 'demo-t3', 1000).ok).toBe(false);
  });
});

describe('budget lifecycle never counts the same money twice', () => {
  it('splits a travelled trip into invoiced and not-yet-invoiced', () => {
    const s = snap();
    const l = tripLifecycle(s, trip(s, 'demo-t1'), NOW);
    expect(l).toMatchObject({ incurred: 214000, committed: 372000, reserved: 0, proposed: 0 });
  });

  it('reserves an approved, unbooked trip and forecasts the cheapest pending option', () => {
    const s = snap();
    expect(tripLifecycle(s, trip(s, 'demo-t4'), NOW).reserved).toBe(874000);
    expect(tripLifecycle(s, trip(s, 'demo-t3'), NOW).proposed).toBe(318000);
  });

  it('nets a credit note against the invoice on a cancelled trip', () => {
    const s = snap();
    expect(tripLifecycle(s, trip(s, 'demo-t6'), NOW)).toMatchObject({ incurred: 282000, committed: 0 });
  });

  it('deducts incurred, committed and reserved — but not proposed — from the budget', () => {
    const s = snap();
    const ryd = centreBudgets(s, NOW).find((c) => c.centre.code === 'PRJ-RYD-07')!;
    expect(ryd.remaining).toBe(18000000 - 214000 - 372000 - 874000);
    const bd = centreBudgets(s, NOW).find((c) => c.centre.code === 'DEP-BD')!;
    expect(bd.remaining).toBe(9000000);
    expect(bd.remainingIfApproved).toBe(9000000 - 318000);
  });

  it('does not count a pending refund as money back', () => {
    const s = snap();
    const exe = centreBudgets(s, NOW).find((c) => c.centre.code === 'DEP-EXE')!;
    // Trip 2 (invoiced flight + committed hotel) and trip 6 (net of the credit note only).
    expect(exe.incurred + exe.committed).toBe(1620000 + 528000 + 282000);
  });
});

describe('open items and visibility', () => {
  it('flags the hotel on a travelled trip that has no invoice, the claimed refund and the expiring credit', () => {
    const kinds = openItems(snap(), NOW).map((i) => i.kind);
    expect(kinds).toContain('Missing invoice');
    expect(kinds).toContain('Refund claimed');
    expect(kinds.some((k) => k.startsWith('Credit expires'))).toBe(true);
  });

  it('shows a traveller only their own trips', () => {
    const s = snap();
    const mine = visibleTrips(s, member(s, 'demo-m-omar')).map((t) => t.id);
    expect(mine.sort()).toEqual(['demo-t1', 'demo-t4']);
    expect(visibleTrips(s, member(s, 'demo-m-amal'))).toHaveLength(6);
  });
});

describe('money input', () => {
  it('parses what people type into fils', () => {
    expect(parseMoney('12,450.5')).toBe(1245050);
    expect(parseMoney('AED 300')).toBe(30000);
    expect(parseMoney('12.345')).toBeNull();
    expect(parseMoney('-5')).toBeNull();
  });
});
