import Link from 'next/link';
import { createCompany } from '@/lib/corporate/workspace/staff-actions';
import { listCompanies, loadSnapshot, WorkspaceNotReady } from '@/lib/corporate/workspace/repo';
import { openItems } from '@/lib/corporate/workspace/budget';
import { tripStage, STAGE_LABELS } from '@/lib/corporate/workspace/rules';
import type { Snapshot } from '@/lib/corporate/workspace/types';

export const dynamic = 'force-dynamic';

/**
 * Corporate clients, and the work waiting on Premium Choice across all of
 * them: requests with no options, approved trips not yet booked, finance items
 * open. The client sees the same records in their workspace.
 */
export default async function CorporateClientsPage({ searchParams }: { searchParams: { error?: string; ok?: string } }) {
  let snapshots: Snapshot[];
  try {
    const companies = await listCompanies();
    snapshots = await Promise.all(companies.map((c) => loadSnapshot(c.id)));
  } catch (e) {
    if (e instanceof WorkspaceNotReady) return <NotReady />;
    throw e;
  }
  const now = new Date();
  const queue = snapshots.flatMap((s) =>
    s.trips
      .map((t) => ({ s, t, stage: tripStage(s, t, now) }))
      .filter(({ stage }) => stage === 'requested' || stage === 'approved'),
  );

  return (
    <>
      <h1 className="font-serif text-3xl text-ink">Corporate clients</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink-soft">
        Each client’s managed travel programme. Clients use the workspace at premiumchoicecorporate.com/workspace; the
        public demo is at <a className="font-semibold text-teal-deep hover:underline" href="/sites/corporate/workspace/demo/finance" target="_blank">/workspace/demo</a>.
      </p>
      {searchParams.error && <p className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{searchParams.error}</p>}

      <section className="mt-8">
        <h2 className="font-serif text-xl text-ink">Waiting on us ({queue.length})</h2>
        {queue.length ? (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-line text-xs uppercase tracking-wider text-ink-soft"><th className="py-2">Trip</th><th>Client</th><th>Route</th><th>Departs</th><th>Next step</th></tr></thead>
            <tbody>
              {queue.sort((a, b) => a.t.departOn.localeCompare(b.t.departOn)).map(({ s, t, stage }) => (
                <tr key={t.id} className="border-b border-line/60">
                  <td className="py-2"><Link className="font-semibold text-teal-deep hover:underline" href={`/admin/corporate/${s.company.id}/trips/${t.id}`}>{t.ref}</Link></td>
                  <td>{s.company.name}</td>
                  <td>{t.origin} → {t.destination}</td>
                  <td>{t.departOn}</td>
                  <td>{stage === 'requested' ? 'Send options' : 'Recheck price and book'} <span className="text-ink-soft">({STAGE_LABELS[stage]})</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mt-2 text-sm text-ink-soft">Nothing waiting.</p>}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-ink">Clients</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {snapshots.map((s) => (
            <li key={s.company.id}>
              <Link href={`/admin/corporate/${s.company.id}`} className="block rounded-xl border border-line bg-white p-4 hover:border-teal-deep">
                <p className="font-serif text-lg text-ink">{s.company.name}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {s.members.filter((m) => m.active).length} people · {s.trips.length} trips · {openItems(s, now).length} open finance items · {s.company.status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
        {!snapshots.length && <p className="mt-2 text-sm text-ink-soft">No clients yet.</p>}
      </section>

      <section className="mt-10 max-w-xl rounded-xl border border-line bg-white p-5">
        <h2 className="font-serif text-xl text-ink">Add a client</h2>
        <form action={createCompany} className="mt-4 grid gap-4 sm:grid-cols-[1fr_160px]">
          <div>
            <label className="field-label" htmlFor="co-name">Company name</label>
            <input id="co-name" name="name" required className="field" />
          </div>
          <div>
            <label className="field-label" htmlFor="co-tol">Price tolerance %</label>
            <input id="co-tol" name="tolerance" type="number" min={0} max={50} step="0.5" defaultValue={0} className="field" />
          </div>
          <p className="text-xs text-ink-soft sm:col-span-2">Tolerance: how far a booked price may exceed the approved quote before the trip needs approving again. 0 means any increase goes back to the approver.</p>
          <button className="btn-primary sm:col-span-2">Create client</button>
        </form>
      </section>
    </>
  );
}

function NotReady() {
  return (
    <>
      <h1 className="font-serif text-3xl text-ink">Corporate clients</h1>
      <div className="mt-6 max-w-2xl rounded-xl border border-line bg-white p-6 text-sm text-ink">
        <p className="font-semibold">One setup step first.</p>
        <p className="mt-2 text-ink-soft">
          Paste <code>supabase/migrations/027-corporate-workspace.sql</code> into the Supabase SQL editor for the Premium
          Choice Travel project and run it. This page then lists your corporate clients.
        </p>
      </div>
    </>
  );
}
