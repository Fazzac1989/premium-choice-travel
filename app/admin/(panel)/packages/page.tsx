import Image from 'next/image';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapPackage } from '@/lib/data';
import { durationLabel, formatPrice } from '@/lib/types';
import { PACKAGE_BRANDS, brandLabel } from '@/lib/brands';
import StatusBadge from '@/components/admin/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams: { brand?: string };
}) {
  const brand = searchParams.brand ?? '';
  const db = createAdminClient();
  let query = db
    .from('packages')
    .select('*, destinations(slug, name, region)')
    .order('updated_at', { ascending: false });
  if (brand) query = query.eq('brand', brand);
  const { data } = await query;
  const packages = (data ?? []).map(mapPackage);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">
            Packages{brand ? ` — Premium Choice ${brandLabel(brand)}` : ''}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{packages.length} package{packages.length === 1 ? '' : 's'} · drafts are hidden from the websites.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/import" className="btn-outline !bg-white">AI import</Link>
          <Link href="/admin/packages/new" className="btn-primary">New package</Link>
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

      <div className="card mt-6 divide-y divide-line">
        {packages.length === 0 && (
          <p className="p-10 text-center text-sm text-ink-soft">
            No packages yet. Run <code className="rounded bg-sand px-1.5 py-0.5">npm run seed</code> for a starter catalogue, or create one now.
          </p>
        )}
        {packages.map((p) => (
          <Link key={p.id} href={`/admin/packages/${p.id}`} className="flex items-center gap-5 p-4 transition-colors hover:bg-sand">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-sand">
              {p.heroImage && <Image src={p.heroImage} alt="" fill sizes="96px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{p.title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                <span className="font-semibold text-teal-deep">{p.brand}</span> · {p.destinationName || '—'} · {p.category || '—'} · {durationLabel(p)}
              </p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              {p.priceFrom !== null && (
                <p className="text-sm font-semibold text-ink">from {formatPrice(p.currency, p.priceFrom)}</p>
              )}
              <div className="mt-1 flex items-center justify-end gap-1.5">
                {p.featured && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase text-white">Featured</span>}
                <StatusBadge status={p.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
