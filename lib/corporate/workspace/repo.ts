import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import type { Account } from '@/lib/account';
import type {
  Approval, AuditEvent, Booking, Company, CostCentre, Entity, Invoice, Member, Offer, Policy, RefundClaim, Role,
  Snapshot, TravelCredit, Trip,
} from './types';

/**
 * Reading and writing the corporate workspace.
 *
 * Tenant isolation lives here: every read takes a company id that the caller
 * got from a membership (never from the URL or a form), and every query
 * filters on it. The service role bypasses RLS, so this file is the boundary.
 */

export class WorkspaceNotReady extends Error {
  constructor() {
    super('The corporate workspace tables are not set up yet (migration 027).');
  }
}

/** A missing table is a setup step, not a crash. */
function check<T>(res: { data: T | null; error: { code?: string; message: string } | null }): T {
  if (res.error) {
    const missing = res.error.code === '42P01' || res.error.code === 'PGRST205' || /relation .* does not exist|Could not find the table/i.test(res.error.message);
    if (missing) throw new WorkspaceNotReady();
    throw new Error(res.error.message);
  }
  return res.data as T;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const mapMember = (r: any): Member => ({
  id: r.id, userId: r.user_id, email: r.email, fullName: r.full_name,
  roles: (r.roles ?? []) as Role[], approvalLimitMinor: num(r.approval_limit_minor), active: r.active,
});

const mapTrip = (r: any): Trip => ({
  id: r.id, ref: r.ref, travellerMemberId: r.traveller_member_id, requestedByMemberId: r.requested_by_member_id,
  entityId: r.entity_id, costCentreId: r.cost_centre_id, purpose: r.purpose, origin: r.origin,
  destination: r.destination, departOn: r.depart_on, returnOn: r.return_on, notes: r.notes,
  cancelledAt: r.cancelled_at, cancelReason: r.cancel_reason, createdAt: r.created_at,
});

const mapOffer = (r: any): Offer => ({
  id: r.id, tripId: r.trip_id, revision: r.revision, label: r.label, details: r.details,
  totalMinor: Number(r.total_minor), currency: r.currency, changeTerms: r.change_terms, refundTerms: r.refund_terms,
  expiresAt: r.expires_at, policyVersion: r.policy_version, inPolicy: r.in_policy, policyNote: r.policy_note,
  recommended: r.recommended, withdrawnAt: r.withdrawn_at, createdAt: r.created_at,
});

const mapApproval = (r: any): Approval => ({
  id: r.id, tripId: r.trip_id, offerId: r.offer_id, approverMemberId: r.approver_member_id, decision: r.decision,
  amountMinor: Number(r.amount_minor), currency: r.currency, policyVersion: r.policy_version, comment: r.comment,
  createdAt: r.created_at,
});

const mapBooking = (r: any): Booking => ({
  id: r.id, tripId: r.trip_id, approvalId: r.approval_id, kind: r.kind, supplier: r.supplier, supplierRef: r.supplier_ref,
  description: r.description, amountMinor: Number(r.amount_minor), currency: r.currency,
  sourceAmountMinor: num(r.source_amount_minor), sourceCurrency: r.source_currency, fxRate: num(r.fx_rate),
  status: r.status, cancelSupplierRef: r.cancel_supplier_ref, cancelPenaltyMinor: num(r.cancel_penalty_minor),
  createdAt: r.created_at, cancelledAt: r.cancelled_at,
});

const mapInvoice = (r: any): Invoice => ({
  id: r.id, tripId: r.trip_id, bookingId: r.booking_id, entityId: r.entity_id, kind: r.kind, number: r.number,
  issuedOn: r.issued_on, amountMinor: Number(r.amount_minor), taxMinor: Number(r.tax_minor), currency: r.currency,
  status: r.status,
});

const mapRefund = (r: any): RefundClaim => ({
  id: r.id, tripId: r.trip_id, bookingId: r.booking_id, supplier: r.supplier, amountMinor: Number(r.amount_minor),
  currency: r.currency, status: r.status, claimedOn: r.claimed_on, receivedOn: r.received_on,
  receivedMinor: num(r.received_minor), note: r.note,
});

const mapCredit = (r: any): TravelCredit => ({
  id: r.id, memberId: r.member_id, airline: r.airline, ticketNumber: r.ticket_number, amountMinor: Number(r.amount_minor),
  currency: r.currency, expiresOn: r.expires_on, restrictions: r.restrictions, status: r.status,
  appliedTripId: r.applied_trip_id,
});

export async function loadSnapshot(companyId: string): Promise<Snapshot> {
  const db = createAdminClient();
  const by = (table: string, order = 'created_at') =>
    db.from(table).select('*').eq('company_id', companyId).order(order, { ascending: false });

  const [company, entities, members, centres, policies, trips, offers, approvals, bookings, invoices, refunds, credits, audit] =
    await Promise.all([
      db.from('corp_companies').select('*').eq('id', companyId).maybeSingle(),
      by('corp_entities'), by('corp_members'), by('corp_cost_centres'), by('corp_policies', 'version'),
      by('corp_trips'), by('corp_offers'), by('corp_approvals'), by('corp_bookings'), by('corp_invoices', 'issued_on'),
      by('corp_refund_claims'), by('corp_travel_credits'),
      db.from('corp_audit_events').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(200),
    ]);

  const c = check(company) as any;
  if (!c) throw new Error('Company not found');
  return {
    company: { id: c.id, name: c.name, billingCurrency: c.billing_currency, priceToleranceBps: c.price_tolerance_bps, status: c.status } as Company,
    entities: (check(entities) as any[]).map((r): Entity => ({ id: r.id, name: r.name, taxNumber: r.tax_number })),
    members: (check(members) as any[]).map(mapMember),
    costCentres: (check(centres) as any[]).map((r): CostCentre => ({
      id: r.id, entityId: r.entity_id, code: r.code, name: r.name, kind: r.kind, clientName: r.client_name, billable: r.billable,
      budgetMinor: num(r.budget_minor), periodStart: r.period_start, periodEnd: r.period_end, active: r.active,
    })),
    policies: (check(policies) as any[]).map((r): Policy => ({ id: r.id, version: r.version, summary: r.summary, createdAt: r.created_at })),
    trips: (check(trips) as any[]).map(mapTrip),
    offers: (check(offers) as any[]).map(mapOffer),
    approvals: (check(approvals) as any[]).map(mapApproval),
    bookings: (check(bookings) as any[]).map(mapBooking),
    invoices: (check(invoices) as any[]).map(mapInvoice),
    refunds: (check(refunds) as any[]).map(mapRefund),
    credits: (check(credits) as any[]).map(mapCredit),
    audit: (check(audit) as any[]).map((r): AuditEvent => ({
      id: Number(r.id), tripId: r.trip_id, actorLabel: r.actor_label, actorKind: r.actor_kind, action: r.action, createdAt: r.created_at,
    })),
  };
}

export type Membership = { companyId: string; member: Member };

/**
 * The signed-in person's place in a client programme, or null.
 *
 * Staff add people by email. The first time someone signs in with that
 * (Supabase-verified) address, the member row is claimed for their account,
 * and from then on it is matched by account id only.
 */
export async function getMembership(account: Account): Promise<Membership | null> {
  if (!isSupabaseConfigured()) return null;
  const db = createAdminClient();
  const own = check(
    await db.from('corp_members').select('*').eq('user_id', account.id).eq('active', true).limit(1),
  ) as any[];
  if (own.length) return { companyId: own[0].company_id, member: mapMember(own[0]) };

  const email = account.email.trim().toLowerCase();
  if (!email) return null;
  const unclaimed = check(
    await db.from('corp_members').select('*').ilike('email', email).is('user_id', null).eq('active', true).limit(1),
  ) as any[];
  if (!unclaimed.length) return null;
  // Exact match only: ilike treats _ and % as wildcards.
  if (String(unclaimed[0].email).toLowerCase() !== email) return null;
  const claimed = check(
    await db.from('corp_members').update({ user_id: account.id }).eq('id', unclaimed[0].id).is('user_id', null).select('*').maybeSingle(),
  ) as any;
  const row = claimed ?? unclaimed[0];
  return { companyId: row.company_id, member: mapMember({ ...row, user_id: account.id }) };
}

export async function audit(
  companyId: string,
  entry: { tripId?: string | null; actorUserId: string | null; actorLabel: string; actorKind: 'client' | 'staff'; action: string; detail?: Record<string, unknown> },
) {
  const db = createAdminClient();
  const { error } = await db.from('corp_audit_events').insert({
    company_id: companyId,
    trip_id: entry.tripId ?? null,
    actor_user_id: entry.actorUserId,
    actor_label: entry.actorLabel,
    actor_kind: entry.actorKind,
    action: entry.action,
    detail: entry.detail ?? {},
  });
  // The audit trail must not silently stop: log loudly, but the action itself already happened.
  if (error) console.error('[corp audit]', error.message);
}

/** Companies for the staff console, newest first. */
export async function listCompanies() {
  const db = createAdminClient();
  return (check(await db.from('corp_companies').select('*').order('created_at', { ascending: false })) as any[]).map(
    (c): Company => ({ id: c.id, name: c.name, billingCurrency: c.billing_currency, priceToleranceBps: c.price_tolerance_bps, status: c.status }),
  );
}
