import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';
import { createQuoteFromBookingRequest, updateBookingRequest } from '@/lib/admin/quote-actions';
import { getTravellers, passportWarning } from '@/lib/travellers';
import SupplierBookingPanel from '@/components/admin/SupplierBookingPanel';

export const dynamic = 'force-dynamic';
// A Hotelbeds confirmation is allowed to take up to a minute; give the
// server actions on this page room for that.
export const maxDuration = 90;

export const metadata = { title: 'Booking request — Admin' };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 border-b border-line py-2.5 last:border-0">
      <p className="w-44 shrink-0 text-xs uppercase tracking-wider text-ink-soft">{label}</p>
      <div className="min-w-0 text-sm text-ink">{value}</div>
    </div>
  );
}

export default async function AdminRequestPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { note?: string };
}) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: r } = await db.from('booking_requests').select('*').eq('id', Number(params.id)).maybeSingle();
  if (!r) notFound();

  const { data: quotes } = await db
    .from('quotes')
    .select('id, ref, title, status')
    .eq('booking_request_id', r.id)
    .order('created_at', { ascending: false });

  // Their saved travellers, so whoever books this has the passport spellings
  // without emailing to ask for them.
  const travellers = r.customer_id ? await getTravellers(r.customer_id) : [];

  const margin = r.net_amount ? Math.round(Number(r.amount) - Number(r.net_amount)) : null;
  const money = (n: any) => `${r.currency} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/requests" className="text-sm font-semibold text-teal-deep hover:underline">
        ← Booking requests
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">{r.hotel_name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {r.name} · {r.email}
            {r.phone ? ` · ${r.phone}` : ''}
          </p>
        </div>
        <span className="rounded-full bg-sand px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
          {r.status}
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="rounded-2xl border border-line bg-white p-6">
            <h2 className="font-serif text-xl text-ink">What they asked for</h2>
            <div className="mt-4">
              <Row label="Stay" value={`${r.check_in} · ${r.nights} night${r.nights === 1 ? '' : 's'}`} />
              <Row
                label="Party"
                value={`${r.adults} adult${r.adults === 1 ? '' : 's'}${r.children ? `, ${r.children} child${r.children === 1 ? '' : 'ren'}${Array.isArray(r.children_ages) && r.children_ages.length ? ` (ages ${r.children_ages.join(', ')})` : ''}` : ''}`}
              />
              <Row label="Room" value={r.room_name} />
              <Row label="Board" value={r.board} />
              <Row
                label="Cancellation"
                value={
                  r.refundable === true
                    ? `Refundable${r.cancel_by ? ` until ${r.cancel_by}` : ''}`
                    : r.refundable === false
                      ? 'Non-refundable'
                      : null
                }
              />
              <Row label="Reply by" value={r.channel} />
              <Row
                label="Their notes"
                value={r.notes ? <span className="whitespace-pre-line">{r.notes}</span> : null}
              />
            </div>
          </div>

          <form action={updateBookingRequest} className="mt-6 rounded-2xl border border-line bg-white p-6">
            <input type="hidden" name="id" value={r.id} />
            <h2 className="font-serif text-xl text-ink">Where it got to</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
              <div>
                <label className="field-label">Status</label>
                <select name="status" defaultValue={r.status} className="field">
                  <option value="new">New</option>
                  <option value="quoted">Quoted</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="field-label">Internal notes</label>
                <textarea
                  name="admin_notes"
                  rows={3}
                  defaultValue={r.admin_notes ?? ''}
                  className="field"
                  placeholder="What the supplier came back with, who is handling it…"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary mt-4 !px-6">
              Save
            </button>
          </form>

          <SupplierBookingPanel r={r} note={searchParams.note} />
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-ink p-6 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
              What the customer saw
            </p>
            <p className="mt-2 font-serif text-3xl text-teal">{money(r.amount)}</p>
            {r.net_amount && (
              <p className="mt-2 text-sm text-white/70">
                Our cost {money(r.net_amount)} · margin{' '}
                <strong className="text-white">{money(margin)}</strong>
              </p>
            )}
            {r.extra_fees && (
              <p className="mt-2 text-xs leading-relaxed text-white/60">
                Payable at the hotel: {r.extra_fees}
              </p>
            )}
            <p className="mt-3 text-[11px] leading-relaxed text-white/50">
              Taken when they asked. Confirm the rate with the supplier before replying — it may
              have moved.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6">
            <h3 className="font-serif text-lg text-ink">Quotes</h3>
            {quotes && quotes.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {quotes.map((q: any) => (
                  <li key={q.id}>
                    <Link href={`/admin/quotes/${q.id}`} className="text-sm font-semibold text-teal-deep hover:underline">
                      {q.ref} — {q.status}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Nothing quoted yet.</p>
            )}
            <form action={createQuoteFromBookingRequest} className="mt-4">
              <input type="hidden" name="request_id" value={r.id} />
              <button type="submit" className="btn-primary w-full">
                Build a quote from this
              </button>
            </form>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Opens a draft already filled in with the hotel, dates, party and their price.
            </p>
          </div>

          {travellers.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-6">
              <h3 className="font-serif text-lg text-ink">Their travellers</h3>
              <p className="mt-1 text-xs text-ink-soft">
                Saved by the customer. Names are as printed in the passport.
              </p>
              <ul className="mt-3 space-y-3">
                {travellers.map((t) => {
                  const alert = passportWarning(t.passportExpiry);
                  return (
                    <li key={t.id} className="border-t border-line pt-3 first:border-0 first:pt-0">
                      <p className="text-sm font-semibold text-ink">{t.fullName}</p>
                      <p className="text-xs text-ink-soft">
                        {[t.label, t.nationality, t.dateOfBirth ? `b. ${t.dateOfBirth}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {t.passportNumber && (
                        <p className="mt-0.5 font-mono text-xs text-ink">
                          {t.passportNumber}
                          {t.passportExpiry ? ` · exp ${t.passportExpiry}` : ''}
                        </p>
                      )}
                      {t.notes && <p className="mt-0.5 text-xs text-ink-soft">{t.notes}</p>}
                      {alert && <p className="mt-1 text-xs font-semibold text-amber-700">{alert}</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {r.offer_id && (
            <div className="rounded-2xl border border-line bg-white p-6">
              <h3 className="font-serif text-lg text-ink">Supplier reference</h3>
              <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-ink-soft">
                {r.offer_id.slice(0, 180)}…
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
