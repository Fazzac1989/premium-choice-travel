/**
 * Premium Choice Corporate client workspace — the domain, as the app holds it.
 *
 * Mirrors supabase/migrations/027-corporate-workspace.sql. Client-safe: no
 * server imports, so the pure rules and the demo can be used anywhere.
 * Money is integer minor units (fils) in the company's billing currency.
 */

export const ROLES = ['traveller', 'arranger', 'approver', 'finance', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  traveller: 'Traveller',
  arranger: 'Travel arranger',
  approver: 'Approver',
  finance: 'Finance',
  admin: 'Programme admin',
};

export type Company = {
  id: string;
  name: string;
  billingCurrency: string;
  priceToleranceBps: number;
  status: 'active' | 'paused' | 'closed';
};

export type Entity = { id: string; name: string; taxNumber: string | null };

export type Member = {
  id: string;
  userId: string | null;
  email: string;
  fullName: string;
  roles: Role[];
  approvalLimitMinor: number | null;
  active: boolean;
};

export type CostCentre = {
  id: string;
  entityId: string | null;
  code: string;
  name: string;
  kind: 'department' | 'project';
  clientName: string | null;
  billable: boolean;
  budgetMinor: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  active: boolean;
};

export type Policy = {
  id: string;
  version: number;
  summary: string;
  createdAt: string;
};

export type Trip = {
  id: string;
  ref: string;
  travellerMemberId: string;
  requestedByMemberId: string | null;
  entityId: string | null;
  costCentreId: string | null;
  purpose: string;
  origin: string;
  destination: string;
  departOn: string;
  returnOn: string | null;
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
};

export type Offer = {
  id: string;
  tripId: string;
  revision: number;
  label: string;
  details: string;
  totalMinor: number;
  currency: string;
  changeTerms: string | null;
  refundTerms: string | null;
  expiresAt: string;
  policyVersion: number | null;
  inPolicy: boolean;
  policyNote: string | null;
  recommended: boolean;
  withdrawnAt: string | null;
  createdAt: string;
};

export type Approval = {
  id: string;
  tripId: string;
  offerId: string;
  approverMemberId: string;
  decision: 'approved' | 'declined';
  amountMinor: number;
  currency: string;
  policyVersion: number | null;
  comment: string | null;
  createdAt: string;
};

export const BOOKING_KINDS = ['flight', 'hotel', 'transfer', 'car', 'rail', 'visa', 'other'] as const;
export type BookingKind = (typeof BOOKING_KINDS)[number];

export type Booking = {
  id: string;
  tripId: string;
  approvalId: string | null;
  kind: BookingKind;
  supplier: string;
  supplierRef: string;
  description: string;
  amountMinor: number;
  currency: string;
  sourceAmountMinor: number | null;
  sourceCurrency: string | null;
  fxRate: number | null;
  status: 'confirmed' | 'cancelled';
  cancelSupplierRef: string | null;
  cancelPenaltyMinor: number | null;
  createdAt: string;
  cancelledAt: string | null;
};

export type Invoice = {
  id: string;
  tripId: string | null;
  bookingId: string | null;
  entityId: string | null;
  kind: 'invoice' | 'credit_note';
  number: string;
  issuedOn: string;
  amountMinor: number;
  taxMinor: number;
  currency: string;
  status: 'issued' | 'paid' | 'disputed';
};

export type RefundClaim = {
  id: string;
  tripId: string | null;
  bookingId: string | null;
  supplier: string;
  amountMinor: number;
  currency: string;
  status: 'claimed' | 'authorised' | 'received' | 'rejected';
  claimedOn: string;
  receivedOn: string | null;
  receivedMinor: number | null;
  note: string | null;
};

export type TravelCredit = {
  id: string;
  memberId: string;
  airline: string;
  ticketNumber: string;
  amountMinor: number;
  currency: string;
  expiresOn: string;
  restrictions: string | null;
  status: 'available' | 'applied' | 'expired';
  appliedTripId: string | null;
};

export type AuditEvent = {
  id: number;
  tripId: string | null;
  actorLabel: string;
  actorKind: 'client' | 'staff';
  action: string;
  createdAt: string;
};

/** Everything one company's workspace shows, loaded once per request. */
export type Snapshot = {
  company: Company;
  entities: Entity[];
  members: Member[];
  costCentres: CostCentre[];
  policies: Policy[];
  trips: Trip[];
  offers: Offer[];
  approvals: Approval[];
  bookings: Booking[];
  invoices: Invoice[];
  refunds: RefundClaim[];
  credits: TravelCredit[];
  audit: AuditEvent[];
};

/** Money for display: "AED 12,450.00". */
export function formatMoney(minor: number, currency = 'AED') {
  const sign = minor < 0 ? '−' : '';
  const abs = Math.abs(minor) / 100;
  return `${sign}${currency} ${abs.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "12,450.50" typed by a person → 1245050 fils. Null when it is not a sensible amount. */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/[,\s]/g, '').replace(/^AED/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, frac = ''] = clean.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}
