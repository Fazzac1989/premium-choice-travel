import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { BRANDS } from '@/lib/brands';
import { mapBrochure } from '@/lib/package-brochure/schema';
import PkgBrochureList, { type CataloguePackage } from '@/components/admin/PkgBrochureList';

/** /admin/brands/<key>, matching every other screen in this section. */
const brandByKey = (key: string) => BRANDS.find((b) => b.key === key) ?? null;

export const dynamic = 'force-dynamic';

export default async function BrandBrochuresPage({ params }: { params: { brand: string } }) {
  const brand = brandByKey(params.brand);
  if (!brand || !brand.sellsPackages) notFound();

  const db = createAdminClient();
  const { data, error } = await db
    .from('package_brochures')
    .select('*')
    .eq('brand', brand.key)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false });

  if (error) {
    return (
      <p className="card p-10 text-sm text-danger">
        Brochure Studio is unavailable until the{' '}
        <code>supabase/migrations/025-package-brochures.sql</code> migration has been run.
      </p>
    );
  }

  const brochures = (data ?? []).map(mapBrochure);

  // Page counts, so the list can say how long each brochure is.
  const { data: pageRows } = await db
    .from('package_brochure_pages')
    .select('brochure_id')
    .eq('hidden', false);
  const pageCounts: Record<number, number> = {};
  for (const p of pageRows ?? []) pageCounts[p.brochure_id] = (pageCounts[p.brochure_id] ?? 0) + 1;

  // Only published journeys: a brochure reads a package's facts at render
  // time, so a draft would print whatever it held that afternoon.
  const { data: packageRows } = await db
    .from('packages')
    .select('id, title, category, nights, details, destinations(name, region)')
    .eq('brand', brand.key)
    .eq('status', 'published')
    .order('title');

  const catalogue: CataloguePackage[] = (packageRows ?? []).map((p: any) => ({
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
      <Link href={`/admin/brands/${brand.key}`} className="text-sm font-semibold text-teal-deep hover:underline">
        ← {brand.shortName}
      </Link>

      <div className="mt-4">
        <p className="eyebrow">{brand.name}</p>
        <h1 className="font-serif text-3xl text-ink">Brochure Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Build a brochure from your published journeys. It reads as a deck on screen and prints to
          a PDF from the same document — the journeys stay the source of truth, and a live brochure
          follows them as they change.
        </p>
      </div>

      <PkgBrochureList
        brand={brand.key}
        brandName={brand.name}
        brochures={brochures}
        pageCounts={pageCounts}
        catalogue={catalogue}
        siteUrl={siteUrl}
      />
    </>
  );
}
