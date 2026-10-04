import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, Details, Field, Flash, Scope } from '@/components/corporate/workspace/admin-bits';
import { centreBudgets, openItems } from '@/lib/corporate/workspace/budget';
import { loadSnapshot } from '@/lib/corporate/workspace/repo';
import { STAGE_LABELS, tripStage } from '@/lib/corporate/workspace/rules';
import {
  addCostCentre, addCredit, addEntity, addMember, addPolicyVersion, advanceRefund, inviteMember, setCreditStatus,
  setInvoiceStatus, updateCompany, updateMember,
} from '@/lib/corporate/workspace/staff-actions';
import { formatMoney, ROLE_LABELS, ROLES } from '@/lib/corporate/workspace/types';

export const dynamic = 'force-dynamic';

const aed = (minor: number | null) => (minor === null ? '' : (minor / 100).toFixed(2));

export default async function CorporateClientPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound();
  const s = await loadSnapshot(params.id).catch(() => null);
  if (!s) notFound();
  const now = new Date();
  const back = `/admin/corporate/${s.company.id}`;
  const scope = <Scope company={s.company.id} back={back} />;
  const name = (id: string | null) => s.members.find((m) => m.id === id)?.fullName ?? '—';
  const tripRef = (id: string | null) => s.trips.find((t) => t.id === id)?.ref ?? '—';

  return (
    <>
      <Link href="/admin/corporate" className="text-sm font-semibold text-teal-deep hover:underline">← Corporate clients</Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">{s.company.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {s.company.status} · price tolerance {(s.company.priceToleranceBps / 100).toFixed(1)}% · {openItems(s, now).length} open finance items
      </p>
      <Flash ok={searchParams.ok} error={searchParams.error} />

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Trips">
          {s.trips.length ? (
            <ul className="divide-y divide-line text-sm">
              {s.trips.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`${back}/trips/${t.id}`} className="font-semibold text-teal-deep hover:underline">{t.ref}</Link>
                  <span>{name(t.travellerMemberId)} · {t.origin} → {t.destination} · {t.departOn}</span>
                  <span className="text-ink-soft">{STAGE_LABELS[tripStage(s, t, now)]}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">No trips yet. Clients request trips from their workspace.</p>}
        </Card>

        <Card title="Budgets">
          <table className="w-full text-left text-sm">
            <thead><tr className="text-xs uppercase tracking-wider text-ink-soft"><th className="py-1">Code</th><th>Budget</th><th>Spent + committed</th><th>Remaining</th></tr></thead>
            <tbody>
              {centreBudgets(s, now).map((b) => (
                <tr key={b.centre.id} className="border-t border-line/60">
                  <td className="py-1.5">{b.centre.code}</td>
                  <td>{b.budget === null ? '—' : formatMoney(b.budget)}</td>
                  <td>{formatMoney(b.incurred + b.committed + b.reserved)}</td>
                  <td className={b.remaining !== null && b.remaining < 0 ? 'text-danger' : ''}>{b.remaining === null ? '—' : formatMoney(b.remaining)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Details summary="Add a cost centre">
            <form action={addCostCentre} className="grid gap-3 sm:grid-cols-2">
              {scope}
              <Field label="Code"><input name="code" required className="field" placeholder="PRJ-123" /></Field>
              <Field label="Name"><input name="name" required className="field" /></Field>
              <Field label="Type"><select name="kind" className="field"><option value="department">Department</option><option value="project">Project</option></select></Field>
              <Field label="Entity"><select name="entity" className="field"><option value="">—</option>{s.entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
              <Field label="End client (projects)"><input name="client_name" className="field" /></Field>
              <Field label="Budget (AED)"><input name="budget" className="field" placeholder="Optional" /></Field>
              <Field label="Period start"><input name="period_start" type="date" className="field" /></Field>
              <Field label="Period end"><input name="period_end" type="date" className="field" /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="billable" /> Billable to the end client</label>
              <button className="btn-primary sm:col-span-2">Add cost centre</button>
            </form>
          </Details>
        </Card>

        <Card title="People">
          <ul className="space-y-3">
            {s.members.map((m) => (
              <li key={m.id} className="rounded-lg border border-line p-3">
                <form action={updateMember} className="space-y-2">
                  {scope}
                  <input type="hidden" name="member" value={m.id} />
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink">{m.fullName} <span className="font-normal text-ink-soft">{m.email}</span></p>
                    <span className="text-xs text-ink-soft">{m.userId ? 'Has signed in' : 'Not signed in yet'}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {ROLES.map((r) => (
                      <label key={r} className="flex items-center gap-1.5"><input type="checkbox" name="roles" value={r} defaultChecked={m.roles.includes(r)} /> {ROLE_LABELS[r]}</label>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Approval limit (AED)"><input name="limit" defaultValue={aed(m.approvalLimitMinor)} className="field !w-40" placeholder="No limit" /></Field>
                    <label className="flex items-center gap-1.5 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={m.active} /> Active</label>
                    <button className="btn-outline !px-4 !py-2 text-sm">Save</button>
                  </div>
                </form>
                <form action={inviteMember} className="mt-2">
                  {scope}
                  <input type="hidden" name="member" value={m.id} />
                  <button className="text-xs font-semibold text-teal-deep hover:underline">Email a sign-in link</button>
                </form>
              </li>
            ))}
          </ul>
          <Details summary="Add a person">
            <form action={addMember} className="grid gap-3 sm:grid-cols-2">
              {scope}
              <Field label="Full name"><input name="full_name" required className="field" /></Field>
              <Field label="Work email"><input name="email" type="email" required className="field" /></Field>
              <div className="flex flex-wrap gap-3 text-sm sm:col-span-2">
                {ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-1.5"><input type="checkbox" name="roles" value={r} defaultChecked={r === 'traveller'} /> {ROLE_LABELS[r]}</label>
                ))}
              </div>
              <Field label="Approval limit (AED)"><input name="limit" className="field" placeholder="Approvers only; blank = no limit" /></Field>
              <button className="btn-primary sm:col-span-2">Add person</button>
            </form>
          </Details>
        </Card>

        <Card title="Programme">
          <form action={updateCompany} className="grid gap-3 sm:grid-cols-3">
            {scope}
            <Field label="Name" className="sm:col-span-3"><input name="name" defaultValue={s.company.name} className="field" /></Field>
            <Field label="Price tolerance %"><input name="tolerance" type="number" min={0} max={50} step="0.5" defaultValue={s.company.priceToleranceBps / 100} className="field" /></Field>
            <Field label="Status"><select name="status" defaultValue={s.company.status} className="field"><option>active</option><option>paused</option><option>closed</option></select></Field>
            <div className="flex items-end"><button className="btn-outline w-full !py-2.5">Save</button></div>
          </form>
          <h3 className="mt-6 text-sm font-bold text-ink">Entities</h3>
          <ul className="mt-1 text-sm text-ink-soft">{s.entities.map((e) => <li key={e.id}>{e.name}{e.taxNumber ? ` · TRN ${e.taxNumber}` : ''}</li>)}</ul>
          <form action={addEntity} className="mt-3 flex flex-wrap gap-2">
            {scope}
            <input name="name" required className="field !w-56" placeholder="Legal entity name" />
            <input name="tax_number" className="field !w-40" placeholder="TRN (optional)" />
            <button className="btn-outline !px-4 !py-2 text-sm">Add entity</button>
          </form>
          <h3 className="mt-6 text-sm font-bold text-ink">Travel policy {s.policies[0] ? `· version ${s.policies[0].version}` : ''}</h3>
          {s.policies[0] && <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{s.policies[0].summary}</p>}
          <Details summary="Publish a new policy version">
            <form action={addPolicyVersion} className="space-y-3">
              {scope}
              <textarea name="summary" rows={6} required className="field" defaultValue={s.policies[0]?.summary ?? ''} />
              <p className="text-xs text-ink-soft">Versions are never edited. New options record the newest version; existing approvals keep theirs.</p>
              <button className="btn-primary">Publish</button>
            </form>
          </Details>
        </Card>

        <Card title="Airline credits">
          {s.credits.length ? (
            <ul className="space-y-2 text-sm">
              {s.credits.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2">
                  <span>{name(c.memberId)} · {c.airline} {c.ticketNumber} · {formatMoney(c.amountMinor)} · expires {c.expiresOn}</span>
                  <form action={setCreditStatus} className="flex items-center gap-2">
                    {scope}
                    <input type="hidden" name="credit" value={c.id} />
                    <select name="status" defaultValue={c.status} className="field !w-28 !py-1.5"><option>available</option><option>applied</option><option>expired</option></select>
                    <select name="trip" defaultValue={c.appliedTripId ?? ''} className="field !w-36 !py-1.5">
                      <option value="">Used on trip…</option>
                      {s.trips.filter((t) => t.travellerMemberId === c.memberId).map((t) => <option key={t.id} value={t.id}>{t.ref}</option>)}
                    </select>
                    <button className="btn-outline !px-3 !py-1.5 text-xs">Save</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-soft">No credits on the register.</p>}
          <Details summary="Add a credit">
            <form action={addCredit} className="grid gap-3 sm:grid-cols-2">
              {scope}
              <Field label="Traveller"><select name="member" required className="field">{s.members.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select></Field>
              <Field label="Airline"><input name="airline" required className="field" /></Field>
              <Field label="Ticket number"><input name="ticket" required className="field" /></Field>
              <Field label="Value (AED)"><input name="amount" required className="field" /></Field>
              <Field label="Expires"><input name="expires_on" type="date" required className="field" /></Field>
              <Field label="Restrictions"><input name="restrictions" className="field" placeholder="Named traveller only; reissue fee…" /></Field>
              <button className="btn-primary sm:col-span-2">Add credit</button>
            </form>
          </Details>
        </Card>

        <Card title="Refunds and invoices">
          <h3 className="text-sm font-bold text-ink">Refund claims</h3>
          {s.refunds.length ? (
            <ul className="mt-2 space-y-2 text-sm">
              {s.refunds.map((r) => (
                <li key={r.id} className="border-b border-line/60 pb-2">
                  <p>{tripRef(r.tripId)} · {r.supplier} · {formatMoney(r.amountMinor)} · <strong>{r.status}</strong>{r.receivedMinor !== null ? ` · received ${formatMoney(r.receivedMinor)} on ${r.receivedOn}` : ''}</p>
                  {(r.status === 'claimed' || r.status === 'authorised') && (
                    <form action={advanceRefund} className="mt-1 flex flex-wrap items-center gap-2">
                      {scope}
                      <input type="hidden" name="claim" value={r.id} />
                      <select name="status" className="field !w-32 !py-1.5"><option value="authorised">authorised</option><option value="received">received</option><option value="rejected">rejected</option></select>
                      <input name="received" className="field !w-28 !py-1.5" placeholder="AED received" />
                      <input name="received_on" type="date" className="field !w-40 !py-1.5" />
                      <button className="btn-outline !px-3 !py-1.5 text-xs">Update</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="mt-1 text-sm text-ink-soft">None. Claims are opened from a trip’s booking.</p>}
          <h3 className="mt-5 text-sm font-bold text-ink">Invoices and credit notes</h3>
          {s.invoices.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {s.invoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{i.kind === 'invoice' ? 'Invoice' : 'Credit note'} {i.number} · {tripRef(i.tripId)} · {formatMoney(i.amountMinor)}</span>
                  <form action={setInvoiceStatus} className="flex items-center gap-2">
                    {scope}
                    <input type="hidden" name="invoice" value={i.id} />
                    <select name="status" defaultValue={i.status} className="field !w-28 !py-1.5"><option>issued</option><option>paid</option><option>disputed</option></select>
                    <button className="btn-outline !px-3 !py-1.5 text-xs">Save</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className="mt-1 text-sm text-ink-soft">None yet. Invoices are recorded from a trip.</p>}
        </Card>
      </div>

      <div className="mt-6">
      <Card title="Audit trail">
        <ul className="space-y-1 text-sm">
          {s.audit.slice(0, 40).map((e) => (
            <li key={e.id}><span className="text-ink-soft">{new Date(e.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })}</span> · <strong>{e.actorLabel}</strong> · {e.action}</li>
          ))}
        </ul>
      </Card>
      </div>
    </>
  );
}
