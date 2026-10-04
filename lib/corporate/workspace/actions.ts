'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getAccount } from '@/lib/account';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailShell, sendEmail } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';
import { audit, getMembership, loadSnapshot } from './repo';
import { canApprove, hasRole } from './rules';
import { formatMoney } from './types';

/**
 * What a client can do in the workspace: ask for a trip, and approve or
 * decline an option. Each action works out who is acting from the session,
 * never from the form, and re-checks every rule on the server.
 */

const field = (f: FormData, k: string, max = 300) => String(f.get(k) ?? '').trim().slice(0, max);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

function workspaceBase() {
  return `${brandBase(getBrand('corporate')!)}/workspace`;
}

async function signedInMember() {
  const account = await getAccount();
  if (!account) redirect(`${workspaceBase()}/sign-in`);
  const membership = await getMembership(account);
  if (!membership) redirect(workspaceBase());
  return { account, ...membership };
}

async function notifyStaff(subject: string, lines: string[]) {
  const to = process.env.ENQUIRY_NOTIFY_EMAIL;
  if (!to) return;
  const brand = emailBrand('corporate');
  await sendEmail({
    to,
    subject: `[Corporate] ${subject}`,
    html: emailShell({
      brand,
      eyebrow: 'Corporate workspace',
      title: subject,
      bodyHtml: `<p style="font-size:14px;line-height:1.6">${lines.map((l) => l.replace(/</g, '&lt;')).join('<br/>')}</p>`,
    }),
  });
}

export async function requestTrip(formData: FormData) {
  const { account, companyId, member } = await signedInMember();
  const base = workspaceBase();
  const back = (msg: string) => redirect(`${base}/request?error=${encodeURIComponent(msg)}`);

  const canArrange = hasRole(member, 'arranger');
  if (!canArrange && !hasRole(member, 'traveller')) back('Your role cannot request trips. Ask a travel arranger.');

  const s = await loadSnapshot(companyId);
  const travellerId = canArrange ? field(formData, 'traveller') || member.id : member.id;
  const traveller = s.members.find((m) => m.id === travellerId && m.active);
  if (!traveller) back('Choose who is travelling.');

  const centreId = field(formData, 'cost_centre');
  const centre = centreId ? s.costCentres.find((c) => c.id === centreId && c.active) : null;
  if (centreId && !centre) back('That cost centre is not in your programme.');

  const purpose = field(formData, 'purpose', 200);
  const origin = field(formData, 'origin', 80);
  const destination = field(formData, 'destination', 80);
  const departOn = field(formData, 'depart_on', 10);
  const returnOn = field(formData, 'return_on', 10);
  if (!purpose || !origin || !destination) back('Please give the purpose, where from and where to.');
  if (!isDate(departOn)) back('Please give a departure date.');
  if (returnOn && (!isDate(returnOn) || returnOn < departOn)) back('The return date must be on or after departure.');

  const db = createAdminClient();
  const { data: ref, error: refError } = await db.rpc('corp_next_trip_ref');
  if (refError || !ref) back('We could not open the trip just now. Please try again.');

  const { data: trip, error } = await db
    .from('corp_trips')
    .insert({
      company_id: companyId,
      ref,
      traveller_member_id: traveller!.id,
      requested_by_member_id: member.id,
      entity_id: centre?.entityId ?? null,
      cost_centre_id: centre?.id ?? null,
      purpose,
      origin,
      destination,
      depart_on: departOn,
      return_on: returnOn || null,
      notes: field(formData, 'notes', 2000) || null,
    })
    .select('id, ref')
    .single();
  if (error || !trip) back('We could not save the trip just now. Please try again.');

  const who = traveller!.id === member.id ? 'themselves' : traveller!.fullName;
  await audit(companyId, { tripId: trip!.id, actorUserId: account.id, actorLabel: member.fullName, actorKind: 'client', action: `Requested a trip for ${who}` });
  await notifyStaff(`New trip request ${trip!.ref} — ${s.company.name}`, [
    `${member.fullName} requested a trip for ${traveller!.fullName}.`,
    `${origin} → ${destination}, ${departOn}${returnOn ? ` to ${returnOn}` : ''}.`,
    `Purpose: ${purpose}`,
    centre ? `Cost centre: ${centre.code} ${centre.name}` : 'No cost centre given.',
  ]);

  revalidatePath(base, 'layout');
  redirect(`${base}/trips/${trip!.ref}?sent=1`);
}

export async function decideOffer(formData: FormData) {
  const { account, companyId, member } = await signedInMember();
  const base = workspaceBase();
  const s = await loadSnapshot(companyId);
  const offer = s.offers.find((o) => o.id === field(formData, 'offer'));
  // An offer from another company is simply not found here.
  if (!offer) redirect(`${base}/approvals`);
  const trip = s.trips.find((t) => t.id === offer!.tripId)!;
  const back = (msg: string) => redirect(`${base}/trips/${trip.ref}?error=${encodeURIComponent(msg)}`);

  const decision = field(formData, 'decision') === 'decline' ? 'declined' : 'approved';
  const now = new Date();
  const verdict = canApprove(s, member, offer!, now);
  // Declining is never limited by the amount; everything else still applies.
  const declineOk = !verdict.ok && verdict.reason === 'This is above your approval limit.' && decision === 'declined';
  if (!verdict.ok && !declineOk) back(verdict.reason);

  const policyVersion = s.policies[0]?.version ?? null;
  const db = createAdminClient();
  const { error } = await db.from('corp_approvals').insert({
    company_id: companyId,
    trip_id: trip.id,
    offer_id: offer!.id,
    approver_member_id: member.id,
    decision,
    // The amount is the offer's, never anything the form sent.
    amount_minor: offer!.totalMinor,
    currency: offer!.currency,
    policy_version: offer!.policyVersion ?? policyVersion,
    comment: field(formData, 'comment', 1000) || null,
  });
  if (error) back(error.code === '23505' ? 'This option has already been decided.' : 'We could not record that just now. Please try again.');

  const verb = decision === 'approved' ? 'Approved' : 'Declined';
  await audit(companyId, {
    tripId: trip.id, actorUserId: account.id, actorLabel: member.fullName, actorKind: 'client',
    action: `${verb} ${offer!.label} (${formatMoney(offer!.totalMinor, offer!.currency)})`,
  });
  await notifyStaff(`${verb}: ${trip.ref} — ${s.company.name}`, [
    `${member.fullName} ${verb.toLowerCase()} option ${offer!.revision}: ${offer!.label}, ${formatMoney(offer!.totalMinor, offer!.currency)}.`,
    decision === 'approved' ? 'Recheck the price and availability, then book.' : 'Send a new option if one is needed.',
  ]);

  revalidatePath(base, 'layout');
  redirect(`${base}/trips/${trip.ref}`);
}
