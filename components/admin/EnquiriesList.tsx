import { setEnquiryStatus } from '@/lib/admin/actions';
import StatusBadge from '@/components/admin/StatusBadge';

export default function EnquiriesList({ enquiries }: { enquiries: any[] }) {
  return (
    <div className="card divide-y divide-line">
      {enquiries.length === 0 && (
        <p className="p-10 text-center text-sm text-ink-soft">No enquiries here yet.</p>
      )}
      {enquiries.map((e) => (
        <div key={e.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">
                {e.name} <span className="font-normal text-ink-soft">·</span>{' '}
                <a href={`mailto:${e.email}`} className="font-normal text-teal-deep hover:underline">{e.email}</a>
                {e.phone && <span className="font-normal text-ink-soft"> · {e.phone}</span>}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {new Date(e.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                {e.package_title && <> · about <span className="font-semibold">{e.package_title}</span></>}
                {e.travel_dates && <> · {e.travel_dates}</>}
                {e.travellers && <> · {e.travellers}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={e.status} />
              <form action={setEnquiryStatus} className="flex gap-1">
                <input type="hidden" name="id" value={e.id} />
                {['new', 'contacted', 'closed']
                  .filter((s) => s !== e.status)
                  .map((s) => (
                    <button
                      key={s}
                      type="submit"
                      name="status"
                      value={s}
                      className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-ink-soft hover:border-teal hover:text-teal-deep"
                    >
                      → {s}
                    </button>
                  ))}
              </form>
            </div>
          </div>
          {e.message && <p className="mt-3 whitespace-pre-line rounded-xl bg-sand p-4 text-sm text-ink">{e.message}</p>}
        </div>
      ))}
    </div>
  );
}
