import Link from 'next/link';
import { pcstClient, isPcstConfigured, listStTrips, listStSubjects, listStCountries, PCST_SITE_URL } from '@/lib/pcst';
import { mapBrochure } from '@/lib/brochure/schema';
import StBrochureList from '@/components/admin/StBrochureList';

export const dynamic = 'force-dynamic';

export default async function StBrochuresPage() {
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
    .neq('status', 'archived')
    // Proposals share this table but are a different model, with their own
    // studio at /admin/school-trips/proposals.
    .neq('kind', 'proposal')
    .order('updated_at', { ascending: false });

  if (error) {
    return (
      <p className="card p-10 text-sm text-danger">
        Brochure Studio is unavailable until the <code>20260820000000_brochures.sql</code> migration
        has been run against the School Trips database.
      </p>
    );
  }

  const brochures = (data ?? []).map(mapBrochure);

  // Page counts, so the list can say how long each brochure is.
  const { data: pageRows } = await db.from('brochure_pages').select('brochure_id').eq('hidden', false);
  const pageCounts = new Map<number, number>();
  for (const p of pageRows ?? []) {
    pageCounts.set(p.brochure_id, (pageCounts.get(p.brochure_id) ?? 0) + 1);
  }

  const [trips, subjects, countries] = await Promise.all([
    listStTrips(),
    listStSubjects(),
    listStCountries(),
  ]);

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>

      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Brochure Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Build digital brochures from your published trips. Copy is written from the trip data you
          already hold — the trips stay the source of truth, and a live brochure follows them as they
          change.
        </p>
      </div>

      <StBrochureList
        brochures={brochures}
        pageCounts={Object.fromEntries(pageCounts)}
        trips={trips.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          subject: t.subjectName,
          country: t.countryName,
          durationDays: t.durationDays,
          heroImage: t.heroImage,
        }))}
        subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
        countries={countries.map((c) => ({ id: c.id, name: c.name }))}
        siteUrl={PCST_SITE_URL}
      />
    </>
  );
}
