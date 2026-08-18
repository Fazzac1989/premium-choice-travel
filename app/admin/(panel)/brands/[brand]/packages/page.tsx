import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapPackage } from '@/lib/data';
import { PACKAGE_BRANDS, brandLabel } from '@/lib/brands';
import PackagesTable from '@/components/admin/PackagesTable';

export const dynamic = 'force-dynamic';

export default async function BrandPackagesAdminPage({ params }: { params: { brand: string } }) {
  const brandKey = params.brand;
  if (!PACKAGE_BRANDS.some((b) => b.key === brandKey)) notFound();

  const db = createAdminClient();
  const { data } = await db
    .from('packages')
    .select('*, destinations(slug, name, region)')
    .eq('brand', brandKey)
    .order('updated_at', { ascending: false });
  const packages = (data ?? []).map(mapPackage);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Premium Choice {brandLabel(brandKey)}</p>
          <h1 className="font-serif text-3xl text-ink">Packages</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {packages.length} package{packages.length === 1 ? '' : 's'} in this brand · drafts are hidden from the websites.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/import" className="btn-outline !bg-white">AI import</Link>
          <Link href="/admin/packages/new" className="btn-primary">New package</Link>
        </div>
      </div>
      <div className="mt-6">
        <PackagesTable packages={packages} showBrand={false} />
      </div>
    </>
  );
}
