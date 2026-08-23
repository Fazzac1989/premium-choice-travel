import Link from 'next/link';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import StDestinationPages, { type DestinationRow } from '@/components/admin/StDestinationPages';
import StCitySync from '@/components/admin/StCitySync';

export const dynamic = 'force-dynamic';
// Generating a city page calls Claude; the default function timeout kills it.
export const maxDuration = 120;

export default async function StCitiesPage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const db = pcstClient();
  const { data: cities, error } = await db
    .from('cities')
    .select('id, name, slug, intro, content_updated_at, hero_image, hero_alt, gallery, countries(name)')
    .order('name');

  if (error) {
    return (
      <>
        <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
          ← School Trips
        </Link>
        <p className="card mt-6 p-10 text-sm text-danger">
          Cities are unavailable until the <code>20260823000000_images_and_cities.sql</code> migration
          has been run against the School Trips database.
        </p>
      </>
    );
  }

  // How many published trips sit in each city, by name, so the list shows
  // which pages are actually carrying trips.
  const { data: trips } = await db.from('trips').select('city, status').eq('status', 'published');
  const counts = new Map<string, number>();
  for (const t of trips ?? []) {
    const key = (t.city ?? '').trim().toLowerCase();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const galleryUrls = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.map((g: any) => (typeof g === 'string' ? g : g?.url)).filter((u: unknown): u is string => typeof u === 'string')
      : [];

  const rows: DestinationRow[] = (cities ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    tripCount: counts.get(c.name.trim().toLowerCase()) ?? 0,
    hasContent: Boolean(c.intro),
    heroImage: c.hero_image ?? null,
    heroAlt: c.hero_alt ?? null,
    gallery: galleryUrls(c.gallery),
    contentUpdatedAt: c.content_updated_at ?? null,
  }));

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Cities</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Sub-destinations under a country. A city earns a page once a trip is based there and
          nowhere else — a multi-city route like &ldquo;Tokyo · Kyoto&rdquo; stays a route. Each
          city page carries its own write-up and photography, and lists every trip based there.
        </p>
      </div>

      <StCitySync count={rows.length} />

      {rows.length === 0 ? (
        <p className="card mt-6 p-8 text-sm text-ink-soft">
          No cities yet. Use <strong>Refresh from trips</strong> above to create one page per city in
          the published catalogue.
        </p>
      ) : (
        <StDestinationPages kind="city" rows={rows} siteUrl={PCST_SITE_URL} />
      )}
    </>
  );
}
