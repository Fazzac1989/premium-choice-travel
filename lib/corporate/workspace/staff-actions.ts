'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSignInLink } from '@/lib/sign-in-link';
import { emailShell, sendEmail } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';
import { audit, loadSnapshot } from './repo';
import { activeBookings, canBook, currentApproval } from './rules';
import { BOOKING_KINDS, formatMoney, parseMoney, ROLES, type Role } from './types';

/**
 * What Premium Choice staff do for a client programme, from the admin console.
 *
 * Every action: admin only; every id in the form is checked to belong to the
 * company named in the form before anything is written; every change goes on
 * the audit trail. Money is typed in AED and stored in fils.
 */

const ADMIN = '/admin/corporate';
const f = (d: FormData, k: string, max = 500) => String(d.get(k) ?? '').trim().slice(0, max);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

type Ctx = { companyId: string; staffId: string; staffLabel: string; back: string };

async function staff(d: FormData): Promise<Ctx> {
  const account = await requireAdmin();
  const companyId = f(d, 'company');
  if (!/^[0-9a-f-]{36}$/.test(companyId)) throw new Error('Missing company');
  return {
    companyId,
    staffId: account.id,
    staffLabel: account.fullName || 'Premium Choice',
    back: safeBack(f(d, 'back'), `${ADMIN}/${companyId}`),
  };
}

/** Only ever back into the corporate console, never wherever a form says. */
function safeBack(back: string, fallback: string) {
  return back.startsWith(`${ADMIN}/`) && !back.includes('//') ? back.split('?')[0] : fallback;
}

function fail(c: Ctx, msg: string): never {
  redirect(`${c.back}${c.back.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
}

function done(c: Ctx, msg: string): never {
  revalidatePath(ADMIN, 'layout');
  redirect(`${c.back}${c.back.includes('?') ? '&' : '?'}ok=${encodeURIComponent(msg)}`);
}

/** The row exists and belongs to this company — or the action stops. */
async function owned(c: Ctx, table: string, id: string) {
  if (!id) fail(c, 'Something was not selected.');
  const { data } = await createAdminClient().from(table).select('*').eq('id', id).eq('company_id', c.companyId).maybeSingle();
  if (!data) fail(c, 'That record does not belong to this client.');
  return data as any;
}

const log = (c: Ctx, action: string, tripId: string | null = null, detail: Record<string, unknown> = {}) =>
  audit(c.companyId, { tripId, actorUserId: c.staffId, actorLabel: 'Premium Choice', actorKind: 'staff', action, detail: { ...detail, staff: c.staffLabel } });

function money(c: Ctx, d: FormData, key: string, label: string, optional = false): number | null {
  const raw = f(d, key, 30);
  if (!raw && optional) return null;
  const v = parseMoney(raw);
  if (v === null) fail(c, `${label}: enter an amount like 1250 or 1,250.50.`);
  return v;
}

/* ── Companies, people, codes, policy ─────────────────────── */

export async function createCompany(d: FormData) {
  await requireAdmin();
  const name = f(d, 'name', 160);
  if (!name) redirect(`${ADMIN}?error=${encodeURIComponent('Give the company a name.')}`);
  const tolerance = Math.round(Number(f(d, 'tolerance') || '0') * 100);
  const db = createAdminClient();
  const { data, error } = await db
    .from('corp_companies')
    .insert({ name, price_tolerance_bps: Number.isFinite(tolerance) ? Math.min(Math.max(tolerance, 0), 5000) : 0 })
    .select('id')
    .single();
  if (error || !data) redirect(`${ADMIN}?error=${encodeURIComponent(error?.message ?? 'Could not create the company.')}`);
  revalidatePath(ADMIN, 'layout');
  redirect(`${ADMIN}/${data.id}?ok=${encodeURIComponent('Client created. Add their entities, people and cost centres next.')}`);
}

export async function updateCompany(d: FormData) {
  const c = await staff(d);
  const tolerance = Math.round(Number(f(d, 'tolerance') || '0') * 100);
  const status = f(d, 'status');
  const { error } = await createAdminClient()
    .from('corp_companies')
    .update({
      name: f(d, 'name', 160) || undefined,
      price_tolerance_bps: Math.min(Math.max(Number.isFinite(tolerance) ? tolerance : 0, 0), 5000),
      ...(['active', 'paused', 'closed'].includes(status) ? { status } : {}),
    })
    .eq('id', c.companyId);
  if (error) fail(c, error.message);
  await log(c, `Updated programme settings (tolerance ${(tolerance / 100).toFixed(1)}%)`);
  done(c, 'Saved.');
}

export async function addEntity(d: FormData) {
  const c = await staff(d);
  const name = f(d, 'name', 160);
  if (!name) fail(c, 'Give the entity a name.');
  const { error } = await createAdminClient().from('corp_entities').insert({ company_id: c.companyId, name, tax_number: f(d, 'tax_number', 40) || null });
  if (error) fail(c, error.message);
  await log(c, `Added entity ${name}`);
  done(c, 'Entity added.');
}

export async function addMember(d: FormData) {
  const c = await staff(d);
  const email = f(d, 'email', 200).toLowerCase();
  const name = f(d, 'full_name', 160);
  const roles = d.getAll('roles').map(String).filter((r): r is Role => (ROLES as readonly string[]).includes(r));
  if (!/^\S+@\S+\.\S+$/.test(email) || !name) fail(c, 'Give a name and a valid email.');
  if (!roles.length) fail(c, 'Tick at least one role.');
  const limit = money(c, d, 'limit', 'Approval limit', true);
  const { error } = await createAdminClient().from('corp_members').insert({
    company_id: c.companyId, email, full_name: name, roles, approval_limit_minor: limit,
  });
  if (error) fail(c, error.code === '23505' ? 'That email is already in this programme.' : error.message);
  await log(c, `Added ${name} (${roles.join(', ')})`);
  done(c, `${name} added. They sign in at premiumchoicecorporate.com/workspace with ${email}.`);
}

export async function updateMember(d: FormData) {
  const c = await staff(d);
  const row = await owned(c, 'corp_members', f(d, 'member'));
  const roles = d.getAll('roles').map(String).filter((r): r is Role => (ROLES as readonly string[]).includes(r));
  if (!roles.length) fail(c, 'Tick at least one role.');
  const limit = money(c, d, 'limit', 'Approval limit', true);
  const active = f(d, 'active') === 'on';
  const { error } = await createAdminClient()
    .from('corp_members')
    .update({ roles, approval_limit_minor: limit, active })
    .eq('id', row.id);
  if (error) fail(c, error.message);
  await log(c, `Changed ${row.full_name}: ${roles.join(', ')}${limit !== null ? `, limit ${formatMoney(limit)}` : ''}${active ? '' : ', deactivated'}`);
  done(c, 'Saved.');
}

export async function inviteMember(d: FormData) {
  const c = await staff(d);
  const row = await owned(c, 'corp_members', f(d, 'member'));
  // The link lands on the corporate site's workspace, whatever host staff are on.
  const sent = await sendSignInLinkForCorporate(row.email);
  if (!sent) fail(c, 'The sign-in email could not be sent. Check Supabase email settings.');
  await log(c, `Sent a sign-in link to ${row.full_name}`);
  done(c, `Sign-in link sent to ${row.email}.`);
}

async function sendSignInLinkForCorporate(email: string) {
  // Staff are on the master site, but the client must land — and be signed
  // in — on the corporate domain: a session cookie does not cross domains.
  // Locally there is no such domain, so the link uses the preview path.
  const live = process.env.NODE_ENV === 'production';
  const result = live
    ? await sendSignInLink(email, '/workspace', 'https://premiumchoicecorporate.com')
    : await sendSignInLink(email, '/sites/corporate/workspace');
  return result.ok;
}

export async function addCostCentre(d: FormData) {
  const c = await staff(d);
  const code = f(d, 'code', 40).toUpperCase();
  const name = f(d, 'name', 160);
  if (!code || !name) fail(c, 'Give a code and a name.');
  const entityId = f(d, 'entity');
  if (entityId) await owned(c, 'corp_entities', entityId);
  const budget = money(c, d, 'budget', 'Budget', true);
  const start = f(d, 'period_start', 10);
  const end = f(d, 'period_end', 10);
  const { error } = await createAdminClient().from('corp_cost_centres').insert({
    company_id: c.companyId, code, name, entity_id: entityId || null,
    kind: f(d, 'kind') === 'project' ? 'project' : 'department',
    client_name: f(d, 'client_name', 160) || null, billable: f(d, 'billable') === 'on',
    budget_minor: budget, period_start: isDate(start) ? start : null, period_end: isDate(end) ? end : null,
  });
  if (error) fail(c, error.code === '23505' ? 'That code is already used.' : error.message);
  await log(c, `Added cost centre ${code} ${name}${budget !== null ? ` (budget ${formatMoney(budget)})` : ''}`);
  done(c, 'Cost centre added.');
}

export async function addPolicyVersion(d: FormData) {
  const c = await staff(d);
  const summary = f(d, 'summary', 6000);
  if (!summary) fail(c, 'Write the policy summary.');
  const db = createAdminClient();
  const { data: last } = await db.from('corp_policies').select('version').eq('company_id', c.companyId).order('version', { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { error } = await db.from('corp_policies').insert({ company_id: c.companyId, version, summary, created_by: c.staffId });
  if (error) fail(c, error.message);
  await log(c, `Published travel policy version ${version}`);
  done(c, `Policy version ${version} is now in force.`);
}

/* ── Trips: options, bookings, cancellation ───────────────── */

export async function addOffer(d: FormData) {
  const c = await staff(d);
  const trip = await owned(c, 'corp_trips', f(d, 'trip'));
  if (trip.cancelled_at) fail(c, 'The trip is cancelled.');
  const label = f(d, 'label', 160);
  const details = f(d, 'details', 3000);
  const total = money(c, d, 'total', 'Total');
  const expires = f(d, 'expires_at', 20);
  if (!label || !details) fail(c, 'Give the option a short name and the details.');
  // The form gives Dubai wall-clock time with no zone; the server runs in UTC.
  const expiresAt = new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(expires) ? expires : `${expires.length === 16 ? `${expires}:00` : expires}+04:00`);
  if (!expires || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) fail(c, 'Set when the price expires, in the future.');
  const db = createAdminClient();
  const [{ data: last }, { data: policy }] = await Promise.all([
    db.from('corp_offers').select('revision').eq('trip_id', trip.id).order('revision', { ascending: false }).limit(1).maybeSingle(),
    db.from('corp_policies').select('version').eq('company_id', c.companyId).order('version', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const revision = (last?.revision ?? 0) + 1;
  const { error } = await db.from('corp_offers').insert({
    company_id: c.companyId, trip_id: trip.id, revision, label, details, total_minor: total, currency: 'AED',
    change_terms: f(d, 'change_terms', 300) || null, refund_terms: f(d, 'refund_terms', 300) || null,
    expires_at: expiresAt.toISOString(), policy_version: policy?.version ?? null,
    in_policy: f(d, 'in_policy') === 'on', policy_note: f(d, 'policy_note', 500) || null,
    recommended: f(d, 'recommended') === 'on', created_by: c.staffId,
  });
  if (error) fail(c, error.message);
  await log(c, `Sent option ${revision}: ${label} (${formatMoney(total!)})`, trip.id);
  const told = await tellApprovers(c.companyId, trip, `${label} — ${formatMoney(total!)}, valid until ${expiresAt.toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`);
  done(c, `Option ${revision} is now visible to the client${told ? ` and ${told} approver(s) have been emailed` : ''}.`);
}

/**
 * Email the client's approvers (never the traveller themself) that a trip has
 * an option waiting. The link goes to the corporate site's workspace.
 */
async function tellApprovers(companyId: string, trip: any, line: string) {
  const { data } = await createAdminClient()
    .from('corp_members')
    .select('id, email, full_name, roles')
    .eq('company_id', companyId)
    .eq('active', true);
  const approvers = (data ?? []).filter(
    (m: any) => m.id !== trip.traveller_member_id && (m.roles.includes('approver') || m.roles.includes('admin')),
  );
  const site = process.env.NODE_ENV === 'production' ? 'https://premiumchoicecorporate.com/workspace' : 'http://localhost:3000/sites/corporate/workspace';
  const brand = emailBrand('corporate');
  for (const m of approvers) {
    await sendEmail({
      to: m.email,
      subject: `Approval needed: ${trip.ref} ${trip.origin} → ${trip.destination}`,
      html: emailShell({
        brand,
        eyebrow: 'Travel approval',
        title: `${trip.ref} is waiting for your approval`,
        bodyHtml: `<p style="font-size:14px;line-height:1.6">Hello ${String(m.full_name).replace(/</g, '&lt;')},<br/><br/>We have sent an option for ${String(trip.purpose).replace(/</g, '&lt;')} (${trip.depart_on}):<br/><strong>${line.replace(/</g, '&lt;')}</strong><br/><br/><a href="${site}/trips/${trip.ref}">Review and approve in your workspace</a>. Nothing is booked until it is approved.</p>`,
      }),
    });
  }
  return approvers.length;
}

export async function withdrawOffer(d: FormData) {
  const c = await staff(d);
  const offer = await owned(c, 'corp_offers', f(d, 'offer'));
  if (offer.withdrawn_at) fail(c, 'Already withdrawn.');
  const { error } = await createAdminClient().from('corp_offers').update({ withdrawn_at: new Date().toISOString() }).eq('id', offer.id);
  if (error) fail(c, error.message);
  await log(c, `Withdrew option ${offer.revision}: ${offer.label}`, offer.trip_id);
  done(c, 'Option withdrawn. If it was the approved one, the trip now needs a new option and approval.');
}

export async function recordBooking(d: FormData) {
  const c = await staff(d);
  const trip = await owned(c, 'corp_trips', f(d, 'trip'));
  const kind = f(d, 'kind');
  if (!(BOOKING_KINDS as readonly string[]).includes(kind)) fail(c, 'Choose what was booked.');
  const supplier = f(d, 'supplier', 120);
  const supplierRef = f(d, 'supplier_ref', 80);
  const description = f(d, 'description', 300);
  if (!supplier || !supplierRef || !description) fail(c, 'A booking needs the supplier, its confirmation reference and a description.');
  const amount = money(c, d, 'amount', 'Amount (AED)')!;
  const sourceCurrency = f(d, 'source_currency', 3).toUpperCase();
  const sourceAmount = sourceCurrency ? money(c, d, 'source_amount', 'Supplier amount') : null;
  const fx = sourceCurrency ? Number(f(d, 'fx_rate', 20)) : null;
  if (sourceCurrency && (!fx || !Number.isFinite(fx) || fx <= 0)) fail(c, 'Give the exchange rate used.');
  const actionId = f(d, 'action_id', 36);
  if (!/^[0-9a-f-]{36}$/.test(actionId)) fail(c, 'The form expired. Reload and try again.');

  const s = await loadSnapshot(c.companyId);
  const verdict = canBook(s, trip.id, amount);
  if (!verdict.ok) fail(c, verdict.reason);
  const approval = currentApproval(s, trip.id)!;

  const { error } = await createAdminClient().from('corp_bookings').insert({
    company_id: c.companyId, trip_id: trip.id, approval_id: approval.id, kind, supplier, supplier_ref: supplierRef,
    description, amount_minor: amount, currency: 'AED', source_amount_minor: sourceAmount,
    source_currency: sourceCurrency || null, fx_rate: fx, action_id: actionId, created_by: c.staffId,
  });
  // The same form submitted twice carries the same action id: the second is refused, not booked.
  if (error?.code === '23505') done(c, 'Already recorded — that submission was a repeat.');
  if (error) fail(c, error.message);
  await log(c, `Booked ${kind}: ${supplier} ${supplierRef} (${formatMoney(amount)})`, trip.id);
  done(c, 'Booking recorded.');
}

export async function cancelBooking(d: FormData) {
  const c = await staff(d);
  const booking = await owned(c, 'corp_bookings', f(d, 'booking'));
  if (booking.status === 'cancelled') fail(c, 'Already cancelled.');
  const cancelRef = f(d, 'cancel_ref', 80);
  // Not cancelled until the supplier says so.
  if (!cancelRef) fail(c, 'Enter the supplier’s cancellation reference. A booking is cancelled only once the supplier confirms it.');
  const penalty = money(c, d, 'penalty', 'Cancellation charge', true);
  const { error } = await createAdminClient()
    .from('corp_bookings')
    .update({ status: 'cancelled', cancel_supplier_ref: cancelRef, cancel_penalty_minor: penalty, cancelled_at: new Date().toISOString() })
    .eq('id', booking.id)
    .eq('status', 'confirmed');
  if (error) fail(c, error.message);
  await log(c, `Cancelled ${booking.supplier} ${booking.supplier_ref} (supplier ref ${cancelRef}${penalty ? `, charge ${formatMoney(penalty)}` : ''})`, booking.trip_id);
  done(c, 'Booking cancelled. Record any refund claim and credit note separately.');
}

export async function cancelTrip(d: FormData) {
  const c = await staff(d);
  const trip = await owned(c, 'corp_trips', f(d, 'trip'));
  if (trip.cancelled_at) fail(c, 'Already cancelled.');
  const s = await loadSnapshot(c.companyId);
  if (activeBookings(s, trip.id).length) fail(c, 'Cancel each confirmed booking with the supplier first.');
  const reason = f(d, 'reason', 300);
  if (!reason) fail(c, 'Give a reason.');
  const { error } = await createAdminClient().from('corp_trips').update({ cancelled_at: new Date().toISOString(), cancel_reason: reason }).eq('id', trip.id);
  if (error) fail(c, error.message);
  await log(c, `Cancelled the trip: ${reason}`, trip.id);
  done(c, 'Trip cancelled.');
}

/* ── Finance: invoices, refunds, credits ──────────────────── */

export async function recordInvoice(d: FormData) {
  const c = await staff(d);
  const tripId = f(d, 'trip');
  const bookingId = f(d, 'booking');
  const trip = tripId ? await owned(c, 'corp_trips', tripId) : null;
  const booking = bookingId ? await owned(c, 'corp_bookings', bookingId) : null;
  if (booking && trip && booking.trip_id !== trip.id) fail(c, 'That booking is on another trip.');
  const number = f(d, 'number', 60);
  const issued = f(d, 'issued_on', 10);
  if (!number || !isDate(issued)) fail(c, 'Give the document number and date.');
  const kind = f(d, 'kind') === 'credit_note' ? 'credit_note' : 'invoice';
  const amount = money(c, d, 'amount', 'Amount')!;
  const tax = money(c, d, 'tax', 'VAT', true) ?? 0;
  const { error } = await createAdminClient().from('corp_invoices').insert({
    company_id: c.companyId, trip_id: trip?.id ?? booking?.trip_id ?? null, booking_id: booking?.id ?? null,
    entity_id: trip?.entity_id ?? null, kind, number, issued_on: issued, amount_minor: amount, tax_minor: tax, currency: 'AED',
  });
  if (error) fail(c, error.code === '23505' ? `A ${kind === 'invoice' ? 'invoice' : 'credit note'} with that number already exists.` : error.message);
  await log(c, `Issued ${kind === 'invoice' ? 'invoice' : 'credit note'} ${number} (${formatMoney(amount)})`, trip?.id ?? booking?.trip_id ?? null);
  done(c, 'Recorded.');
}

export async function setInvoiceStatus(d: FormData) {
  const c = await staff(d);
  const inv = await owned(c, 'corp_invoices', f(d, 'invoice'));
  const status = f(d, 'status');
  if (!['issued', 'paid', 'disputed'].includes(status)) fail(c, 'Unknown status.');
  const { error } = await createAdminClient().from('corp_invoices').update({ status }).eq('id', inv.id);
  if (error) fail(c, error.message);
  await log(c, `Marked ${inv.number} ${status}`, inv.trip_id);
  done(c, 'Saved.');
}

export async function addRefundClaim(d: FormData) {
  const c = await staff(d);
  const booking = await owned(c, 'corp_bookings', f(d, 'booking'));
  const amount = money(c, d, 'amount', 'Amount claimed')!;
  const { error } = await createAdminClient().from('corp_refund_claims').insert({
    company_id: c.companyId, trip_id: booking.trip_id, booking_id: booking.id, supplier: booking.supplier,
    amount_minor: amount, currency: 'AED', note: f(d, 'note', 300) || null,
  });
  if (error) fail(c, error.message);
  await log(c, `Claimed a refund of ${formatMoney(amount)} from ${booking.supplier}`, booking.trip_id);
  done(c, 'Refund claim opened.');
}

export async function advanceRefund(d: FormData) {
  const c = await staff(d);
  const claim = await owned(c, 'corp_refund_claims', f(d, 'claim'));
  const status = f(d, 'status');
  if (!['authorised', 'received', 'rejected'].includes(status)) fail(c, 'Unknown status.');
  const patch: Record<string, unknown> = { status };
  if (status === 'received') {
    const got = money(c, d, 'received', 'Amount received')!;
    const on = f(d, 'received_on', 10);
    if (!isDate(on)) fail(c, 'Give the date it was received.');
    patch.received_minor = got;
    patch.received_on = on;
  }
  const { error } = await createAdminClient().from('corp_refund_claims').update(patch).eq('id', claim.id);
  if (error) fail(c, error.message);
  await log(c, `Refund from ${claim.supplier} ${status}${patch.received_minor ? ` (${formatMoney(patch.received_minor as number)})` : ''}`, claim.trip_id);
  done(c, status === 'received' ? 'Recorded. Issue the client a credit note so it reaches their budget.' : 'Saved.');
}

export async function addCredit(d: FormData) {
  const c = await staff(d);
  const member = await owned(c, 'corp_members', f(d, 'member'));
  const airline = f(d, 'airline', 80);
  const ticket = f(d, 'ticket', 40);
  const expires = f(d, 'expires_on', 10);
  if (!airline || !ticket || !isDate(expires)) fail(c, 'Give the airline, ticket number and expiry date.');
  const amount = money(c, d, 'amount', 'Credit value')!;
  const { error } = await createAdminClient().from('corp_travel_credits').insert({
    company_id: c.companyId, member_id: member.id, airline, ticket_number: ticket, amount_minor: amount, currency: 'AED',
    expires_on: expires, restrictions: f(d, 'restrictions', 500) || null,
  });
  if (error) fail(c, error.message);
  await log(c, `Recorded a ${airline} credit for ${member.full_name} (${formatMoney(amount)}, expires ${expires})`);
  done(c, 'Credit added to the register.');
}

export async function setCreditStatus(d: FormData) {
  const c = await staff(d);
  const credit = await owned(c, 'corp_travel_credits', f(d, 'credit'));
  const status = f(d, 'status');
  if (!['available', 'applied', 'expired'].includes(status)) fail(c, 'Unknown status.');
  const tripId = f(d, 'trip');
  if (status === 'applied') {
    if (!tripId) fail(c, 'Choose the trip the credit was used on.');
    const trip = await owned(c, 'corp_trips', tripId);
    // Credits are personal unless the airline says otherwise.
    if (trip.traveller_member_id !== credit.member_id) fail(c, 'That trip is for a different traveller; airline credits are normally non-transferable.');
  }
  const { error } = await createAdminClient()
    .from('corp_travel_credits')
    .update({ status, applied_trip_id: status === 'applied' ? tripId : null })
    .eq('id', credit.id);
  if (error) fail(c, error.message);
  await log(c, `Marked ${credit.airline} credit ${credit.ticket_number} ${status}`, status === 'applied' ? tripId : null);
  done(c, 'Saved.');
}

