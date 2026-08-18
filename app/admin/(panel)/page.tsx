import Image from 'next/image';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatMoney, mapQuote, quoteTotal } from '@/lib/quotes';
import { BRANDS } from '@/lib/brands';
import { getPcstStats } from '@/lib/pcst';
import StatusBadge from '@/components/admin/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const db = createAdminClient();

  const [pkgs, quotes, enquiries, pcst] = await Promise.all([
    db.from('packages').select('id, status, brand'),
    db.from('quotes').select('*, quote_lines(*)').order('updated_at', { ascending: false }).limit(5),
    db.from('enquiries').select('*').order('created_at', { ascending: false }).limit(6),
    getPcstStats(),
  ]);

  const allPkgs = pkgs.data ?? [];
  const countFor = (brand: string) => ({
    published: allPkgs.filter((p) => p.brand === brand && p.status === 'published').length,
    drafts: allPkgs.filter((p) => p.brand === brand && p.status === 'draft').length,
  });

  const recentQuotes = (quotes.data ?? []).map(mapQuote);
  const recentEnquiries = enquiries.data ?? [];
  const newEnquiries = recentEnquiries.filter((e) => e.status === 'new').length;

  const siteBrands = BRANDS.filter((b) => !b.externalUrl);
  const schoolTrips = BRANDS.find((b) => b.externalUrl);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Premium Choice Travel</p>
          <h1 className="font-serif text-3xl text-ink">Group console</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Every brand, one desk — edit content per brand, or jump into quotes and enquiries.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/import" className="btn-outline !bg-white">AI import</Link>
          <Link href="/admin/quotes/new" className="btn-primary">New quote</Link>
        </div>
      </div>

      {/* Brand cards */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {siteBrands.map((b) => {
          const counts = b.sellsPackages || b.key === 'corporate' ? countFor(b.key as string) : null;
          const liveUrl = b.domains[0] ? `https://${b.domains[0]}` : `/sites/${b.slug}`;
          return (
            <div key={b.slug} className="card flex flex-col p-6">
              {b.logoCard ? (
                <Image src={b.logoCard} alt={b.name} width={420} height={116} className="h-14 w-auto self-start rounded-lg border border-line object-contain" />
              ) : (
                <p className="font-serif text-xl text-ink">{b.name}</p>
              )}
              <div className="mt-4 flex gap-6 text-sm">
                {counts && (
                  <>
                    <span><strong className="font-serif text-2xl text-ink">{counts.published}</strong> <span className="text-ink-soft">live</span></span>
                    <span><strong className="font-serif text-2xl text-ink">{counts.drafts}</strong> <span className="text-ink-soft">draft{counts.drafts === 1 ? '' : 's'}</span></span>
                  </>
                )}
                {b.domains[0] && (
                  <span className="ml-auto self-end text-xs text-ink-soft">{b.domains[0]}</span>
                )}
              </div>
              <div className="mt-5 flex gap-2 border-t border-line pt-4">
                <Link href={`/admin/brands/${b.key}`} className="btn-primary flex-1 !px-4 !py-2 text-xs">
                  Open workspace
                </Link>
                <a href={liveUrl} target="_blank" rel="noopener" className="btn-outline flex-1 !px-4 !py-2 text-xs">
                  View site ↗
                </a>
              </div>
            </div>
          );
        })}

        {/* School Trips */}
        {schoolTrips && (
          <div className="card flex flex-col p-6">
            {schoolTrips.logoCard ? (
              <Image src={schoolTrips.logoCard} alt={schoolTrips.name} width={420} height={116} className="h-14 w-auto self-start rounded-lg border border-line object-contain" />
            ) : (
              <p className="font-serif text-xl text-ink">{schoolTrips.name}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {pcst ? (
                <>
                  <span><strong className="font-serif text-2xl text-ink">{pcst.publishedTrips}</strong> <span className="text-ink-soft">live trips</span></span>
                  <span><strong className="font-serif text-2xl text-ink">{pcst.quotes}</strong> <span className="text-ink-soft">quotes</span></span>
                  <span><strong className="font-serif text-2xl text-ink">{pcst.appointments}</strong> <span className="text-ink-soft">appointments</span></span>
                </>
              ) : (
                <span className="text-ink-soft">Runs on its own platform.</span>
              )}
            </div>
            <div className="mt-5 flex gap-2 border-t border-line pt-4">
              <Link href="/admin/school-trips" className="btn-primary flex-1 !px-4 !py-2 text-xs">
                Open workspace
              </Link>
              <a href={schoolTrips.externalUrl} target="_blank" rel="noopener" className="btn-outline flex-1 !px-4 !py-2 text-xs">
                View site ↗
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Cross-brand activity */}
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          { label: 'Packages live across all brands', value: allPkgs.filter((p) => p.status === 'published').length, href: '/admin/packages' },
          { label: 'Quotes in play', value: recentQuotes.filter((q) => ['draft', 'sent'].includes(q.status)).length, href: '/admin/quotes' },
          { label: 'New enquiries', value: newEnquiries, href: '/admin/enquiries' },
        ].map((s) => (
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
            {recentEnquiries.length === 0 && <p className="py-6 text-sm text-ink-soft">Nothing yet — enquiries from every brand site land here.</p>}
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
