import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { BRANDS } from '@/lib/brands';
import { mapBrochure, mapPage } from '@/lib/package-brochure/schema';
import PkgBrochureEditor from '@/components/admin/PkgBrochureEditor';
import type { CataloguePackage } from '@/components/admin/PkgBrochureList';

/** /admin/brands/<key>, matching every other screen in this section. */
const brandByKey = (key: string) => BRANDS.find((b) => b.key === key) ?? null;

export const dynamic = 'force-dynamic';

export default async function BrandBrochureEditorPage({
  params,
}: {
  params: { brand: string; id: string };
}) {
  const brand = brandByKey(params.brand);
  if (!brand || !brand.sellsPackages) notFound();

  const db = createAdminClient();
  const { data: row } = await db
    .from('package_brochures')
    .select('*')
    .eq('id', Number(params.id))
    .maybeSingle();
  if (!row || row.brand !== brand.key) notFound();

  const brochure = mapBrochure(row);

  const { data: pageRows } = await db
    .from('package_brochure_pages')
    .select('*')
    .eq('brochure_id', brochure.id)
    .order('sort_order');
  const pages = (pageRows ?? []).map(mapPage);

  // Everything the editor needs to describe a journey, and to say which pages
  // it could have — a journey with no course notes never gets a courses page.
  const ids = Array.from(
    new Set(pages.map((p) => p.packageId).filter((x): x is number => typeof x === 'number')),
  );
  const { data: inBrochure } = ids.length
    ? await db
        .from('packages')
        .select('id, title, nights, details, itinerary, why_works, who_for, destinations(name, region)')
        .in('id', ids)
    : { data: [] as any[] };

  const packages = (inBrochure ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    destination: p.destinations?.name ?? null,
    region: p.destinations?.region ?? null,
    nights: p.nights ?? 0,
    rounds: typeof p.details?.rounds === 'number' ? p.details.rounds : null,
    courses: Array.isArray(p.details?.courses) ? p.details.courses.length : 0,
    days: Array.isArray(p.itinerary) ? p.itinerary.length : 0,
    hasWhy:
      (Array.isArray(p.why_works) && p.why_works.length > 0) ||
      (Array.isArray(p.who_for) && p.who_for.length > 0),
  }));

  const { data: catalogueRows } = await db
    .from('packages')
    .select('id, title, category, nights, details, destinations(name, region)')
    .eq('brand', brand.key)
    .eq('status', 'published')
    .order('title');

  const catalogue: CataloguePackage[] = (catalogueRows ?? []).map((p: any) => ({
    id: p.id,
    title: p.title,
    destination: p.destinations?.name ?? null,
    region: p.destinations?.region ?? null,
    category: p.category ?? null,
    nights: p.nights ?? 0,
    rounds: typeof p.details?.rounds === 'number' ? p.details.rounds : null,
  }));

  const siteUrl = brand.domains[0]
    ? `https://www.${brand.domains[0]}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? '');

  return (
    <>
      <Link
        href={`/admin/brands/${brand.key}/brochures`}
        className="text-sm font-semibold text-teal-deep hover:underline"
      >
        ← Brochure Studio
      </Link>

      <div className="mt-4">
        <p className="eyebrow">{brand.name}</p>
        <h1 className="font-serif text-3xl text-ink">{brochure.title}</h1>
      </div>

      <PkgBrochureEditor
        brand={brand.key}
        brochure={brochure}
        pages={pages}
        packages={packages}
        catalogue={catalogue}
        siteUrl={siteUrl}
      />
    </>
  );
}
