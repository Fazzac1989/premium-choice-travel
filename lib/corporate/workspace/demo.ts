/**
 * The demo workspace: a fictional client, so anyone can see the workspace
 * without an account. Every name, reference and amount here is invented and
 * the page says so on every screen. Nothing in it is a real booking, ticket,
 * payment or supplier confirmation, and no action from the demo writes
 * anything.
 *
 * Dates are relative to "now" so the demo always looks current, and the set
 * covers every stage the workspace shows: a request with no options yet,
 * options awaiting approval, an approved trip waiting to be booked, a booked
 * trip, a travelled trip missing an invoice, and a cancellation with a refund
 * claim.
 */
import type { Snapshot } from './types';

const day = (now: Date, offset: number) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
  return d.toISOString().slice(0, 10);
};
const at = (now: Date, offset: number, hour = 9) => `${day(now, offset)}T${String(hour).padStart(2, '0')}:00:00.000Z`;
const aed = (n: number) => Math.round(n * 100);

export const DEMO_MEMBER_IDS = {
  finance: 'demo-m-amal',
  approver: 'demo-m-james',
  arranger: 'demo-m-priya',
  traveller: 'demo-m-omar',
} as const;

export function demoSnapshot(now = new Date()): Snapshot {
  const y = now.getUTCFullYear();
  return {
    company: { id: 'demo-co', name: 'Halcyon Engineering (demo)', billingCurrency: 'AED', priceToleranceBps: 500, status: 'active' },
    entities: [
      { id: 'demo-e-dxb', name: 'Halcyon Engineering LLC', taxNumber: null },
      { id: 'demo-e-auh', name: 'Halcyon Technical Services LLC', taxNumber: null },
    ],
    members: [
      { id: 'demo-m-amal', userId: null, email: 'amal@halcyon.example', fullName: 'Amal Rahman', roles: ['finance', 'approver'], approvalLimitMinor: aed(50000), active: true },
      { id: 'demo-m-james', userId: null, email: 'james@halcyon.example', fullName: 'James Okafor', roles: ['approver', 'traveller'], approvalLimitMinor: aed(25000), active: true },
      { id: 'demo-m-priya', userId: null, email: 'priya@halcyon.example', fullName: 'Priya Nair', roles: ['arranger'], approvalLimitMinor: null, active: true },
      { id: 'demo-m-omar', userId: null, email: 'omar@halcyon.example', fullName: 'Omar Saleh', roles: ['traveller'], approvalLimitMinor: null, active: true },
      { id: 'demo-m-lena', userId: null, email: 'lena@halcyon.example', fullName: 'Lena Fischer', roles: ['traveller'], approvalLimitMinor: null, active: true },
    ],
    costCentres: [
      { id: 'demo-cc-ryd', entityId: 'demo-e-dxb', code: 'PRJ-RYD-07', name: 'Riyadh depot fit-out', kind: 'project', clientName: 'Northwind Transit (fictional)', billable: true, budgetMinor: aed(180000), periodStart: `${y}-01-01`, periodEnd: `${y}-12-31`, active: true },
      { id: 'demo-cc-bd', entityId: 'demo-e-dxb', code: 'DEP-BD', name: 'Business development', kind: 'department', clientName: null, billable: false, budgetMinor: aed(90000), periodStart: `${y}-01-01`, periodEnd: `${y}-12-31`, active: true },
      { id: 'demo-cc-exe', entityId: 'demo-e-auh', code: 'DEP-EXE', name: 'Executive office', kind: 'department', clientName: null, billable: false, budgetMinor: aed(60000), periodStart: `${y}-01-01`, periodEnd: `${y}-12-31`, active: true },
    ],
    policies: [
      { id: 'demo-p3', version: 3, summary: 'Economy under 6 hours, business above. Hotels: Riyadh AED 900, London AED 1,400, Cairo AED 750 a night. Book 14+ days ahead where possible. Approver: line director; above AED 25,000, Finance Director.', createdAt: at(now, -120) },
    ],
    trips: [
      { id: 'demo-t1', ref: `PCC-${y}-0041`, travellerMemberId: 'demo-m-omar', requestedByMemberId: 'demo-m-priya', entityId: 'demo-e-dxb', costCentreId: 'demo-cc-ryd', purpose: 'Site survey with the client’s engineering team', origin: 'Dubai', destination: 'Riyadh', departOn: day(now, -21), returnOn: day(now, -17), notes: null, cancelledAt: null, cancelReason: null, createdAt: at(now, -35) },
      { id: 'demo-t2', ref: `PCC-${y}-0047`, travellerMemberId: 'demo-m-james', requestedByMemberId: 'demo-m-priya', entityId: 'demo-e-auh', costCentreId: 'demo-cc-exe', purpose: 'Board meeting and investor lunch', origin: 'Abu Dhabi', destination: 'London', departOn: day(now, 9), returnOn: day(now, 13), notes: 'Prefers the morning flight.', cancelledAt: null, cancelReason: null, createdAt: at(now, -12) },
      { id: 'demo-t3', ref: `PCC-${y}-0052`, travellerMemberId: 'demo-m-lena', requestedByMemberId: 'demo-m-lena', entityId: 'demo-e-dxb', costCentreId: 'demo-cc-bd', purpose: 'Tender presentation', origin: 'Dubai', destination: 'Cairo', departOn: day(now, 16), returnOn: day(now, 18), notes: null, cancelledAt: null, cancelReason: null, createdAt: at(now, -3) },
      { id: 'demo-t4', ref: `PCC-${y}-0053`, travellerMemberId: 'demo-m-omar', requestedByMemberId: 'demo-m-priya', entityId: 'demo-e-dxb', costCentreId: 'demo-cc-ryd', purpose: 'Commissioning — week 1', origin: 'Dubai', destination: 'Riyadh', departOn: day(now, 6), returnOn: day(now, 12), notes: 'Serviced apartment near the depot if possible.', cancelledAt: null, cancelReason: null, createdAt: at(now, -6) },
      { id: 'demo-t5', ref: `PCC-${y}-0055`, travellerMemberId: 'demo-m-lena', requestedByMemberId: 'demo-m-priya', entityId: 'demo-e-dxb', costCentreId: 'demo-cc-bd', purpose: 'Client introduction', origin: 'Dubai', destination: 'Muscat', departOn: day(now, 24), returnOn: day(now, 25), notes: null, cancelledAt: null, cancelReason: null, createdAt: at(now, 0, 8) },
      { id: 'demo-t6', ref: `PCC-${y}-0038`, travellerMemberId: 'demo-m-james', requestedByMemberId: 'demo-m-priya', entityId: 'demo-e-auh', costCentreId: 'demo-cc-exe', purpose: 'Trade fair', origin: 'Abu Dhabi', destination: 'Frankfurt', departOn: day(now, -8), returnOn: day(now, -5), notes: null, cancelledAt: at(now, -30), cancelReason: 'Fair postponed by the organiser', createdAt: at(now, -50) },
    ],
    offers: [
      { id: 'demo-o1', tripId: 'demo-t1', revision: 1, label: 'Saudia direct + Novotel Olaya', details: 'DXB–RUH SV 551 economy, returning SV 556. 4 nights Novotel Olaya, room only.', totalMinor: aed(5860), currency: 'AED', changeTerms: 'Changes AED 250 + fare difference', refundTerms: 'Refundable less AED 400', expiresAt: at(now, -33), policyVersion: 3, inPolicy: true, policyNote: null, recommended: true, withdrawnAt: null, createdAt: at(now, -34) },
      { id: 'demo-o2', tripId: 'demo-t2', revision: 1, label: 'Etihad business + Strand Palace', details: 'AUH–LHR EY 11 business, returning EY 18. 4 nights Strand Palace, breakfast.', totalMinor: aed(21480), currency: 'AED', changeTerms: 'Free changes', refundTerms: 'Fully refundable', expiresAt: at(now, -9), policyVersion: 3, inPolicy: true, policyNote: 'Business class: flight over 6 hours.', recommended: true, withdrawnAt: null, createdAt: at(now, -11) },
      { id: 'demo-o3a', tripId: 'demo-t3', revision: 1, label: 'Emirates + Kempinski Nile', details: 'DXB–CAI EK 927 economy flex, returning EK 928. 2 nights Kempinski Nile, breakfast.', totalMinor: aed(4920), currency: 'AED', changeTerms: 'Changes free up to 24h before', refundTerms: 'Refundable less AED 300', expiresAt: at(now, 2, 18), policyVersion: 3, inPolicy: true, policyNote: null, recommended: true, withdrawnAt: null, createdAt: at(now, -2) },
      { id: 'demo-o3b', tripId: 'demo-t3', revision: 2, label: 'flydubai + Steigenberger Tahrir', details: 'DXB–CAI FZ 921 economy lite, returning FZ 922. 2 nights Steigenberger Tahrir, room only.', totalMinor: aed(3180), currency: 'AED', changeTerms: 'Changes AED 300 + fare difference', refundTerms: 'Non-refundable', expiresAt: at(now, 2, 18), policyVersion: 3, inPolicy: true, policyNote: 'Cheaper, but non-refundable: a tender date that moves would lose the fare.', recommended: false, withdrawnAt: null, createdAt: at(now, -2) },
      { id: 'demo-o4', tripId: 'demo-t4', revision: 1, label: 'Saudia + Fraser Suites', details: 'DXB–RUH SV 553 economy, returning SV 558. 6 nights Fraser Suites, 1-bed apartment.', totalMinor: aed(8740), currency: 'AED', changeTerms: 'Changes AED 250 + fare difference', refundTerms: 'Apartment free cancellation until 3 days before', expiresAt: at(now, 1), policyVersion: 3, inPolicy: true, policyNote: null, recommended: true, withdrawnAt: null, createdAt: at(now, -5) },
      { id: 'demo-o6', tripId: 'demo-t6', revision: 1, label: 'Lufthansa business + Maritim', details: 'AUH–FRA LH 631 business, returning LH 630. 3 nights Maritim Frankfurt.', totalMinor: aed(16950), currency: 'AED', changeTerms: 'Changes AED 500', refundTerms: 'Refundable less AED 1,500', expiresAt: at(now, -48), policyVersion: 3, inPolicy: true, policyNote: null, recommended: true, withdrawnAt: null, createdAt: at(now, -49) },
    ],
    approvals: [
      { id: 'demo-a1', tripId: 'demo-t1', offerId: 'demo-o1', approverMemberId: 'demo-m-james', decision: 'approved', amountMinor: aed(5860), currency: 'AED', policyVersion: 3, comment: null, createdAt: at(now, -34, 14) },
      { id: 'demo-a2', tripId: 'demo-t2', offerId: 'demo-o2', approverMemberId: 'demo-m-amal', decision: 'approved', amountMinor: aed(21480), currency: 'AED', policyVersion: 3, comment: 'Approved — board travel.', createdAt: at(now, -10) },
      { id: 'demo-a4', tripId: 'demo-t4', offerId: 'demo-o4', approverMemberId: 'demo-m-james', decision: 'approved', amountMinor: aed(8740), currency: 'AED', policyVersion: 3, comment: null, createdAt: at(now, -1, 11) },
      { id: 'demo-a6', tripId: 'demo-t6', offerId: 'demo-o6', approverMemberId: 'demo-m-amal', decision: 'approved', amountMinor: aed(16950), currency: 'AED', policyVersion: 3, comment: null, createdAt: at(now, -48) },
    ],
    bookings: [
      { id: 'demo-b1f', tripId: 'demo-t1', approvalId: 'demo-a1', kind: 'flight', supplier: 'Saudia', supplierRef: 'DEMO-7XK2QP', description: 'DXB–RUH return, economy', amountMinor: aed(2140), currency: 'AED', sourceAmountMinor: null, sourceCurrency: null, fxRate: null, status: 'confirmed', cancelSupplierRef: null, cancelPenaltyMinor: null, createdAt: at(now, -33), cancelledAt: null },
      { id: 'demo-b1h', tripId: 'demo-t1', approvalId: 'demo-a1', kind: 'hotel', supplier: 'Novotel Olaya', supplierRef: 'DEMO-H88213', description: '4 nights, room only', amountMinor: aed(3720), currency: 'AED', sourceAmountMinor: aed(3800), sourceCurrency: 'SAR', fxRate: 0.979, status: 'confirmed', cancelSupplierRef: null, cancelPenaltyMinor: null, createdAt: at(now, -33), cancelledAt: null },
      { id: 'demo-b2f', tripId: 'demo-t2', approvalId: 'demo-a2', kind: 'flight', supplier: 'Etihad', supplierRef: 'DEMO-4LMN8R', description: 'AUH–LHR return, business', amountMinor: aed(16200), currency: 'AED', sourceAmountMinor: null, sourceCurrency: null, fxRate: null, status: 'confirmed', cancelSupplierRef: null, cancelPenaltyMinor: null, createdAt: at(now, -9), cancelledAt: null },
      { id: 'demo-b2h', tripId: 'demo-t2', approvalId: 'demo-a2', kind: 'hotel', supplier: 'Strand Palace', supplierRef: 'DEMO-SP5521', description: '4 nights, breakfast', amountMinor: aed(5280), currency: 'AED', sourceAmountMinor: null, sourceCurrency: null, fxRate: null, status: 'confirmed', cancelSupplierRef: null, cancelPenaltyMinor: null, createdAt: at(now, -9), cancelledAt: null },
      { id: 'demo-b6f', tripId: 'demo-t6', approvalId: 'demo-a6', kind: 'flight', supplier: 'Lufthansa', supplierRef: 'DEMO-9QWE3T', description: 'AUH–FRA return, business', amountMinor: aed(13900), currency: 'AED', sourceAmountMinor: null, sourceCurrency: null, fxRate: null, status: 'cancelled', cancelSupplierRef: 'DEMO-CXL-4471', cancelPenaltyMinor: aed(1500), createdAt: at(now, -47), cancelledAt: at(now, -30) },
    ],
    invoices: [
      { id: 'demo-i1', tripId: 'demo-t1', bookingId: 'demo-b1f', entityId: 'demo-e-dxb', kind: 'invoice', number: 'DEMO-INV-1182', issuedOn: day(now, -32), amountMinor: aed(2140), taxMinor: 0, currency: 'AED', status: 'paid' },
      { id: 'demo-i2', tripId: 'demo-t2', bookingId: 'demo-b2f', entityId: 'demo-e-auh', kind: 'invoice', number: 'DEMO-INV-1207', issuedOn: day(now, -8), amountMinor: aed(16200), taxMinor: 0, currency: 'AED', status: 'issued' },
      { id: 'demo-i6', tripId: 'demo-t6', bookingId: 'demo-b6f', entityId: 'demo-e-auh', kind: 'invoice', number: 'DEMO-INV-1131', issuedOn: day(now, -46), amountMinor: aed(13900), taxMinor: 0, currency: 'AED', status: 'paid' },
      { id: 'demo-c6', tripId: 'demo-t6', bookingId: 'demo-b6f', entityId: 'demo-e-auh', kind: 'credit_note', number: 'DEMO-CN-0219', issuedOn: day(now, -12), amountMinor: aed(11080), taxMinor: 0, currency: 'AED', status: 'issued' },
    ],
    refunds: [
      { id: 'demo-r6', tripId: 'demo-t6', bookingId: 'demo-b6f', supplier: 'Lufthansa', amountMinor: aed(12400), currency: 'AED', status: 'received', claimedOn: day(now, -30), receivedOn: day(now, -13), receivedMinor: aed(11080), note: 'Fare less cancellation charge' },
      { id: 'demo-r6t', tripId: 'demo-t6', bookingId: 'demo-b6f', supplier: 'Lufthansa', amountMinor: aed(1320), currency: 'AED', status: 'claimed', claimedOn: day(now, -12), receivedOn: null, receivedMinor: null, note: 'Unused airport taxes' },
    ],
    credits: [
      { id: 'demo-cr1', memberId: 'demo-m-lena', airline: 'Emirates', ticketNumber: 'DEMO-176-2210', amountMinor: aed(2140), currency: 'AED', expiresOn: day(now, 41), restrictions: 'Named traveller only; Emirates-operated flights; reissue fee AED 200.', status: 'available', appliedTripId: null },
      { id: 'demo-cr2', memberId: 'demo-m-omar', airline: 'flydubai', ticketNumber: 'DEMO-141-0937', amountMinor: aed(860), currency: 'AED', expiresOn: day(now, 150), restrictions: 'Named traveller only.', status: 'available', appliedTripId: null },
    ],
    audit: [
      { id: 6, tripId: 'demo-t5', actorLabel: 'Priya Nair', actorKind: 'client', action: 'Requested a trip for Lena Fischer', createdAt: at(now, 0, 8) },
      { id: 5, tripId: 'demo-t3', actorLabel: 'Premium Choice', actorKind: 'staff', action: 'Sent 2 options for approval', createdAt: at(now, -2) },
      { id: 4, tripId: 'demo-t4', actorLabel: 'James Okafor', actorKind: 'client', action: 'Approved Saudia + Fraser Suites (AED 8,740.00)', createdAt: at(now, -1, 11) },
      { id: 3, tripId: 'demo-t6', actorLabel: 'Premium Choice', actorKind: 'staff', action: 'Recorded refund received from Lufthansa (AED 11,080.00)', createdAt: at(now, -13) },
    ],
  };
}
