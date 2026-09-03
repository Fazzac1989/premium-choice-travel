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

  // The teachers this brochure has gone to. Before the invites migration the
  // table does not exist, and the tab simply lists nobody.
  const { data: inviteRows } = await db
    .from('brochure_invites')
    .select('*')
    .eq('brochure_id', id)
    .order('created_at', { ascending: false });
  const logoIds = (inviteRows ?? []).map((r) => r.logo_image_id).filter(Boolean);
  const { data: logoRows } = logoIds.length
    ? await db.from('brochure_images').select('id, storage_path').in('id', logoIds)
    : { data: [] as any[] };
  const logoUrl = (imageId: number | null) => {
    const hit = (logoRows ?? []).find((l) => l.id === imageId);
    return hit ? db.storage.from('brochure-images').getPublicUrl(hit.storage_path).data.publicUrl : null;
  };
  const invites = (inviteRows ?? []).map((r) => ({
    id: r.id as number,
    token: r.token as string,
    teacherName: (r.teacher_name ?? '') as string,
    schoolName: (r.school_name ?? '') as string,
    email: (r.email ?? null) as string | null,
    message: (r.message ?? '') as string,
    logoUrl: logoUrl(r.logo_image_id),
    openCount: (r.open_count ?? 0) as number,
    firstOpenedAt: (r.first_opened_at ?? null) as string | null,
    sentAt: (r.sent_at ?? null) as string | null,
    createdAt: (r.created_at ?? '') as string,
  }));

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
        trips={trips.map((t) => ({ id: t.id, title: t.title, days: (t.days ?? []).length }))}
        warnings={warnings}
        invites={invites}
        siteUrl={PCST_SITE_URL}
      />
    </>
  );
}
