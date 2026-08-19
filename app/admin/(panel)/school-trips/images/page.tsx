import Link from 'next/link';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import StImageCurator, { type CuratorTrip } from '@/components/admin/StImageCurator';

export const dynamic = 'force-dynamic';

export default async function StImagesPage({ searchParams }: { searchParams: { trip?: string } }) {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const db = pcstClient();
  const imagesRes = await db
    .from('trip_images')
    .select(
      'id, trip_id, role, url, alt_text, caption, width, height, photographer, licence, source_url, sort_order'
    );

  if (imagesRes.error) {
    return (
      <p className="card p-10 text-sm text-danger">
        Photography curation is unavailable until the <code>20260817000000_trip_images.sql</code>{' '}
        migration has been run against the School Trips database.
      </p>
    );
  }

  // Drafts need photography too — they are usually the ones that still lack it.
  const { data: trips } = await db
    .from('trips')
    .select('id, slug, title, status, hero_image, subjects(name), countries(name)')
    .order('title');

  const byTrip = new Map<number, any[]>();
  for (const img of imagesRes.data ?? []) {
    const list = byTrip.get(img.trip_id);
    if (list) list.push(img);
    else byTrip.set(img.trip_id, [img]);
  }

  const rows: CuratorTrip[] = (trips ?? []).map((t: any) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    status: t.status,
    subject: t.subjects?.name ?? null,
    country: t.countries?.name ?? null,
    legacyHero: t.hero_image,
    images: (byTrip.get(t.id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({
        id: i.id,
        role: i.role,
        url: i.url,
        altText: i.alt_text ?? '',
        caption: i.caption,
        width: i.width,
        height: i.height,
        photographer: i.photographer,
        licence: i.licence,
        sourceUrl: i.source_url,
        sortOrder: i.sort_order,
      })),
  }));

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Photography</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">
          Shortlists come from Wikimedia Commons, filtered to freely licensed images above the
          minimum resolution, with paintings and diagrams excluded. Nothing is published until you
          approve it; approving downloads a hosted copy and records the photographer, licence and
          source so attribution can be honoured.
        </p>
      </div>

      <StImageCurator
        trips={rows}
        initialTripId={searchParams.trip ? Number(searchParams.trip) : null}
        siteUrl={PCST_SITE_URL}
      />
    </>
  );
}
