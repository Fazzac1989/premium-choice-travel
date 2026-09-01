import Link from 'next/link';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import StProposalList from '@/components/admin/StProposalList';

export const dynamic = 'force-dynamic';

export default async function StProposalsPage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const db = pcstClient();
  const { data, error } = await db
    .from('brochures')
    .select('*')
    .eq('kind', 'proposal')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });

  if (error) {
    return (
      <p className="card p-10 text-sm text-danger">
        Proposals are unavailable until the <code>20260902000000_brochure_proposals.sql</code>{' '}
        migration has been run against the School Trips database.
      </p>
    );
  }

  const rows = data ?? [];

  // Day counts, so the list can say how long each trip is without loading them.
  const { data: dayRows } = await db
    .from('brochure_days')
    .select('brochure_id')
    .in('brochure_id', rows.length ? rows.map((r) => r.id) : [0]);

  const dayCounts = new Map<number, number>();
  for (const d of dayRows ?? []) {
    dayCounts.set(d.brochure_id, (dayCounts.get(d.brochure_id) ?? 0) + 1);
  }

  const proposals = rows.map((r) => ({
    id: r.id as number,
    title: (r.title ?? '') as string,
    preparedFor: (r.prepared_for ?? '') as string,
    status: (r.status ?? 'draft') as string,
    travelStart: (r.travel_start ?? null) as string | null,
    travelEnd: (r.travel_end ?? null) as string | null,
    pricePerStudent: (r.price_per_student ?? null) as number | null,
    currency: (r.currency ?? 'AED') as string,
    studentCount: (r.student_count ?? null) as number | null,
    hasLink: Boolean(r.share_token),
    shareExpiresAt: (r.share_expires_at ?? null) as string | null,
    viewCount: (r.view_count ?? 0) as number,
    updatedAt: (r.updated_at ?? null) as string | null,
    days: dayCounts.get(r.id) ?? 0,
  }));

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>

      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Proposals</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          A proposal is written for one school and priced for them. Build it here, then send a
          private link — the same document the school reads is what prints and what becomes the PDF.
        </p>
      </div>

      <StProposalList proposals={proposals} />
    </>
  );
}
