import { listStRequests } from '@/lib/pcst';
import StRequestStatus from '@/components/admin/StRequestStatus';

export const dynamic = 'force-dynamic';

export default async function StRequestsPage() {
  const requests = await listStRequests();

  return (
    <>
      <div>
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Appointments & enquiries</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Requests submitted through the School Trips website, live from its platform.
        </p>
      </div>

      <div className="card mt-8 divide-y divide-line">
        {requests.length === 0 && (
          <p className="p-10 text-center text-sm text-ink-soft">
            No appointment requests or enquiries yet — they’ll appear here the moment a
            teacher submits one on the School Trips site.
          </p>
        )}
        {requests.map((r) => (
          <div key={`${r.table}-${r.id}`} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-deep">
                {r.table === 'appointment_requests' ? 'Appointment request' : 'Enquiry'}
              </p>
              <div className="flex items-center gap-3">
                <p className="text-xs text-ink-soft">
                  {new Date(r.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                {/* Only appointments carry a workflow status; enquiries are just read. */}
                {r.table === 'appointment_requests' ? (
                  <StRequestStatus id={r.id} status={r.status ?? 'new'} />
                ) : (
                  r.status && <span className="text-xs text-ink-soft">{r.status}</span>
                )}
              </div>
            </div>
            <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {Object.entries(r.fields).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="shrink-0 font-semibold capitalize text-ink">{k}:</dt>
                  <dd className="min-w-0 break-words text-ink-soft">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
