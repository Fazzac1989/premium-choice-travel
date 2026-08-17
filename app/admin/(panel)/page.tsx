import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatMoney, mapQuote, quoteTotal } from '@/lib/quotes';
import StatusBadge from '@/components/admin/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const db = createAdminClient();

  const [pkgs, quotes, enquiries] = await Promise.all([
    db.from('packages').select('id, status'),
    db.from('quotes').select('*, quote_lines(*)').order('updated_at', { ascending: false }).limit(5),
    db.from('enquiries').select('*').order('created_at', { ascending: false }).limit(6),
  ]);

  const published = (pkgs.data ?? []).filter((p) => p.status === 'published').length;
  const drafts = (pkgs.data ?? []).length - published;
  const recentQuotes = (quotes.data ?? []).map(mapQuote);
  const recentEnquiries = enquiries.data ?? [];
  const newEnquiries = recentEnquiries.filter((e) => e.status === 'new').length;

  const stats = [
    { label: 'Published packages', value: published, href: '/admin/packages' },
    { label: 'Draft packages', value: drafts, href: '/admin/packages' },
    { label: 'Quotes in play', value: recentQuotes.filter((q) => ['draft', 'sent'].includes(q.status)).length, href: '/admin/quotes' },
    { label: 'New enquiries', value: newEnquiries, href: '/admin/enquiries' },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-ink-soft">The state of the shop, at a glance.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/packages/new" className="btn-outline !bg-white">New package</Link>
          <Link href="/admin/quotes/new" className="btn-primary">New quote</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-6 transition-shadow hover:shadow-lg">
            <p className="font-serif text-4xl text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-ink">Recent quotes</h2>
            <Link href="/admin/quotes" className="text-sm font-semibold text-teal-deep hover:underline">All quotes →</Link>
          </div>
          <div className="mt-4 divide-y divide-line">
            {recentQuotes.length === 0 && <p className="py-6 text-sm text-ink-soft">No quotes yet — create your first one.</p>}
            {recentQuotes.map((q) => (
              <Link key={q.id} href={`/admin/quotes/${q.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-sand">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{q.title}</p>
                  <p className="text-xs text-ink-soft">{q.ref} · {q.clientName ?? 'No client yet'}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ink">{formatMoney(q.currency, quoteTotal(q.lines))}</p>
                  <StatusBadge status={q.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-ink">Latest enquiries</h2>
            <Link href="/admin/enquiries" className="text-sm font-semibold text-teal-deep hover:underline">All enquiries →</Link>
          </div>
          <div className="mt-4 divide-y divide-line">
            {recentEnquiries.length === 0 && <p className="py-6 text-sm text-ink-soft">Nothing yet — enquiries from the website land here.</p>}
            {recentEnquiries.map((e) => (
              <div key={e.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{e.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${e.status === 'new' ? 'bg-teal/15 text-teal-deep' : 'bg-line text-ink-soft'}`}>
                    {e.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  {e.package_title ? `${e.package_title} · ` : ''}{e.email}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
