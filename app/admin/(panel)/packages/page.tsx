import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapPackage } from '@/lib/data';
import { PACKAGE_BRANDS, brandLabel } from '@/lib/brands';
import PackagesTable, { StatusFilters, filterByStatus } from '@/components/admin/PackagesTable';

export const dynamic = 'force-dynamic';

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams: { brand?: string; status?: string };
}) {
  const brand = searchParams.brand ?? '';
  const db = createAdminClient();
  let query = db
    .from('packages')
    .select('*, destinations(slug, name, region)')
    .order('updated_at', { ascending: false });
  if (brand) query = query.eq('brand', brand);
  const { data } = await query;
  const status = searchParams.status ?? '';
  const packages = filterByStatus((data ?? []).map(mapPackage), status);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">
            Journeys{brand ? ` — Premium Choice ${brandLabel(brand)}` : ''}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{packages.length} journey{packages.length === 1 ? '' : 's'} · only Published journeys appear on the websites.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/import" className="btn-outline !bg-white">AI import</Link>
          <Link href="/admin/packages/new" className="btn-primary">New journey</Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/admin/packages"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${!brand ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
        >
          All brands
        </Link>
        {PACKAGE_BRANDS.map((b) => (
          <Link
            key={b.key}
            href={`/admin/packages?brand=${b.key}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${brand === b.key ? 'bg-teal text-white' : 'bg-white text-ink-soft hover:text-ink'}`}
          >
            {b.label}
          </Link>
        ))}
      </div>

      <StatusFilters base={brand ? `/admin/packages?brand=${brand}` : '/admin/packages'} active={status} />

      <div className="mt-4">
        <PackagesTable packages={packages} />
      </div>
    </>
  );
}
