import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import { mapBrochure, mapBrochurePage } from '@/lib/brochure/schema';
import { loadTripRecords, checkTrips } from '@/lib/brochure/build';
import StBrochureEditor from '@/components/admin/StBrochureEditor';

export const dynamic = 'force-dynamic';

export default async function StBrochurePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  if (!isPcstConfigured()) {
    return <p className="card p-10 text-sm text-danger">The School Trips database is not configured.</p>;
  }

  const db = pcstClient();
  const [{ data: row }, { data: pageRows }] = await Promise.all([
    db.from('brochures').select('*').eq('id', id).maybeSingle(),
    db.from('brochure_pages').select('*').eq('brochure_id', id).order('sort_order'),
  ]);
  if (!row) notFound();

  const brochure = mapBrochure(row);
  const pages = (pageRows ?? []).map(mapBrochurePage);

  // Titles for the page list, and the pre-publish warnings.
  const trips = await loadTripRecords(brochure.tripIds);
  const warnings = checkTrips(trips, brochure.detailLevel);
  const tripTitles = Object.fromEntries(trips.map((t) => [t.id, t.title]));

  return (
    <>
      <Link
        href="/admin/school-trips/brochures"
        className="text-sm font-semibold text-teal-deep hover:underline"
      >
        ← Brochure Studio
      </Link>

      <StBrochureEditor
        brochure={brochure}
        pages={pages}
        tripTitles={tripTitles}
        warnings={warnings}
        siteUrl={PCST_SITE_URL}
      />
    </>
  );
}
