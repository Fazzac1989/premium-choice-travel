import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Booking requests — Admin' };

const TONE: Record<string, string> = {
  new: 'bg-teal text-white',
  quoted: 'bg-teal/15 text-teal-deep',
  confirmed: 'bg-ink text-white',
  closed: 'bg-sand text-ink-soft',
};

function when(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default async function AdminRequestsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: requests } = await db
    .from('booking_requests')
    .select('*')
    .order('created_at', { ascending: false });

  const rows = requests ?? [];
  const open = rows.filter((r: any) => r.status === 'new').length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Booking requests</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Rooms customers have asked for from the Staycations site. Nothing here is booked —
            each one needs the rate confirming with the supplier.
          </p>
        </div>
        {open > 0 && (
          <span className="rounded-full bg-teal px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
            {open} awaiting a reply
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-white p-12 text-center">
          <p className="font-serif text-xl text-ink">No booking requests yet.</p>
          <p className="mt-2 text-sm text-ink-soft">
            They arrive here the moment someone sends one from a hotel page.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-sand/60 text-[11px] uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-semibold">Received</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Hotel &amp; stay</th>
                <th className="px-5 py-3 text-right font-semibold">Quoted</th>
                <th className="px-5 py-3 text-right font-semibold">Margin</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => {
                const margin = r.net_amount ? Math.round(Number(r.amount) - Number(r.net_amount)) : null;
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-sand/40">
                    <td className="whitespace-nowrap px-5 py-4 text-ink-soft">{when(r.created_at)}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/requests/${r.id}`} className="font-semibold text-ink hover:text-teal-deep">
                        {r.name}
                      </Link>
                      <p className="text-xs text-ink-soft">{r.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{r.hotel_name}</p>
                      <p className="text-xs text-ink-soft">
                        {r.check_in} · {r.nights}n · {r.adults} ad
                        {r.children ? `, ${r.children} ch` : ''}
                        {r.room_name ? ` · ${r.room_name}` : ''}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-ink">
                      {r.currency} {Number(r.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-ink-soft">
                      {margin !== null ? `${r.currency} ${margin.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${TONE[r.status] ?? 'bg-sand text-ink-soft'}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
