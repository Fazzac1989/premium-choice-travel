import Link from 'next/link';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';

export const dynamic = 'force-dynamic';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 3650, label: 'All time' },
] as const;

function duration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
}

export default async function StAnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const days = Number(searchParams.days) || 30;
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const db = pcstClient();
  const [statsRes, tripsRes] = await Promise.all([
    db.rpc('trip_view_stats', { since }),
    db.from('trips').select('id, title, slug, status'),
  ]);

  // The table and function arrive with the same migration, so one check covers both.
  if (statsRes.error) {
    return (
      <p className="card p-10 text-sm text-danger">
        View tracking is unavailable until the <code>20260814000000_trip_views.sql</code> migration
        has been run against the School Trips database.
      </p>
    );
  }

  const trips = new Map((tripsRes.data ?? []).map((t: any) => [t.id, t]));
  const rows = (statsRes.data ?? []).map((r: any) => ({
    ...r,
    trip: trips.get(r.trip_id),
    avg: r.avg_dwell_seconds === null ? null : Number(r.avg_dwell_seconds),
    total: Number(r.total_dwell_seconds ?? 0),
    views: Number(r.views),
  }));

  const totalViews = rows.reduce((s: number, r: any) => s + r.views, 0);
  const engaged = rows.filter((r: any) => r.avg !== null);
  const overallAvg = engaged.length
    ? engaged.reduce((s: number, r: any) => s + r.avg * r.views, 0) /
      engaged.reduce((s: number, r: any) => s + r.views, 0)
    : null;

  const cards = [
    { label: 'Views', value: totalViews.toLocaleString() },
    { label: 'Itineraries viewed', value: String(rows.length) },
    { label: 'Average time', value: duration(overallAvg) },
  ];

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Premium Choice School Trips</p>
          <h1 className="font-serif text-3xl text-ink">Analytics</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            Which itineraries teachers look at, and how long they stay. Anonymous and cookie-less.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/admin/school-trips/analytics?days=${r.days}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                days === r.days
                  ? 'border-ink bg-ink text-white'
                  : 'border-line text-ink-soft hover:border-teal hover:text-teal-deep'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <p className="eyebrow">{c.label}</p>
            <p className="mt-1 font-serif text-3xl text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="card mt-8 p-10 text-center text-sm text-ink-soft">
          No views recorded in this period yet.
        </p>
      ) : (
        <div className="card mt-8 divide-y divide-line">
          {rows.map((r: any, i: number) => (
            <div key={r.trip_id} className="flex flex-wrap items-center gap-4 p-4">
              <span className="w-6 shrink-0 text-sm text-ink-soft">{i + 1}</span>

              <div className="min-w-[180px] flex-1">
                {r.trip ? (
                  <Link
                    href={`/admin/school-trips/trips/${r.trip_id}`}
                    className="font-semibold text-ink hover:text-teal-deep"
                  >
                    {r.trip.title}
                  </Link>
                ) : (
                  <span className="italic text-ink-soft">Deleted trip #{r.trip_id}</span>
                )}
                {r.trip && r.trip.status !== 'published' && (
                  <span className="ml-2 text-xs text-ink-soft">({r.trip.status})</span>
                )}
                {r.trip && (
                  <a
                    href={`${PCST_SITE_URL}/trips/${r.trip.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block text-xs text-ink-soft hover:text-teal-deep"
                  >
                    /trips/{r.trip.slug} ↗
                  </a>
                )}
              </div>

              <div className="flex shrink-0 gap-6 text-right text-sm tabular-nums">
                <span className="w-16">
                  <span className="block font-semibold text-ink">{r.views.toLocaleString()}</span>
                  <span className="block text-[11px] text-ink-soft">views</span>
                </span>
                <span className="w-20">
                  <span className="block text-ink">{duration(r.avg)}</span>
                  <span className="block text-[11px] text-ink-soft">average</span>
                </span>
                <span className="hidden w-20 sm:block">
                  <span className="block text-ink-soft">{duration(r.total)}</span>
                  <span className="block text-[11px] text-ink-soft">total</span>
                </span>
                <span className="hidden w-16 md:block">
                  <span className="block text-ink-soft">
                    {new Date(r.last_viewed).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="block text-[11px] text-ink-soft">last seen</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-ink-soft">
        Time is counted only while the page is actually on screen, ignores visits under two seconds,
        and is capped at 30 minutes so a forgotten tab can&apos;t skew the average.
      </p>
    </>
  );
}
