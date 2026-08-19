import Link from 'next/link';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import StTaxonomyManager, { type TaxonomyRow } from '@/components/admin/StTaxonomyManager';

export const dynamic = 'force-dynamic';

export default async function StSubjectsPage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const { data } = await pcstClient()
    .from('subjects')
    .select('id, name, slug, trips(count)')
    .order('name');

  const rows: TaxonomyRow[] = (data ?? []).map((s: any) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    tripCount: s.trips?.[0]?.count ?? 0,
  }));

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Subjects</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          The curriculum areas trips are filed under. Each one gets its own page on the School Trips
          site, so the name is public copy.
        </p>
      </div>

      <StTaxonomyManager kind="subject" rows={rows} />
    </>
  );
}
