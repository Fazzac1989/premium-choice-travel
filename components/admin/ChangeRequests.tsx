import { answerChangeRequest, type ChangeRequestRow } from '@/lib/admin/change-request-actions';

/**
 * What the customer has asked from their own trips page.
 *
 * Placed above the supplier panel on purpose: a cancellation request sitting
 * unread while someone books the next thing is the failure this exists to
 * prevent. Nothing here acts on the supplier — cancelling is still the
 * Hotelbeds panel, and re-pricing is still a quote.
 */

const LABEL: Record<string, string> = {
  cancel: 'Wants to cancel',
  amend: 'Wants to change something',
  question: 'Asked a question',
};

export default function ChangeRequests({ id, rows }: { id: number; rows: ChangeRequestRow[] }) {
  if (!rows.length) return null;
  const open = rows.filter((r) => r.status === 'new');

  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-ink">From the customer</h2>
        {open.length > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800">
            {open.length} waiting
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-5">
        {rows.map((r) => (
          <li key={r.id} className="border-t border-line pt-4 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className={`text-sm font-bold ${r.kind === 'cancel' ? 'text-red-700' : 'text-ink'}`}>
                {LABEL[r.kind] ?? r.kind}
              </p>
              <p className="text-xs text-ink-soft">
                {String(r.createdAt).slice(0, 16).replace('T', ' ')} · {r.email}
              </p>
            </div>

            <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.message}</p>

            {r.termsAtRequest && (
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Cancellation standing they were shown: {r.termsAtRequest}
              </p>
            )}

            {r.status === 'new' ? (
              <form action={answerChangeRequest} className="mt-3">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="change_id" value={r.id} />
                <label className="field-label">Reply to the customer (emailed; leave blank to just close it)</label>
                <textarea
                  name="staff_note"
                  rows={2}
                  className="field"
                  placeholder={
                    r.kind === 'cancel'
                      ? 'The hotel will charge AED … to cancel. Confirm and we will do it.'
                      : 'We can move you to the 14th for AED … more. Shall we?'
                  }
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="submit" name="status" value="done" className="btn-primary !px-5 !py-2 text-sm">
                    Send and close
                  </button>
                  <button type="submit" name="status" value="in_progress" className="btn-outline !px-5 !py-2 text-sm">
                    Send and keep open
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3 rounded-lg bg-sand px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  {r.status === 'done' ? 'Dealt with' : r.status}
                  {r.handledBy ? ` by ${r.handledBy}` : ''}
                  {r.handledAt ? ` · ${r.handledAt.slice(0, 10)}` : ''}
                </p>
                {r.staffNote && <p className="mt-1 whitespace-pre-line text-sm text-ink">{r.staffNote}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>

      {open.some((r) => r.kind === 'cancel') && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          Nothing has been cancelled with the supplier. Agree the charge with the customer first, then
          use <strong>Cancel with Hotelbeds</strong> below.
        </p>
      )}
    </div>
  );
}
