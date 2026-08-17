import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapDestination, mapPackage } from '@/lib/data';
import PackageForm from '@/components/admin/PackageForm';

export const dynamic = 'force-dynamic';

export default async function EditPackagePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const db = createAdminClient();
  const [pkgRes, destRes] = await Promise.all([
    db.from('packages').select('*, destinations(slug, name, region)').eq('id', id).maybeSingle(),
    db.from('destinations').select('*').order('sort_order'),
  ]);
  if (!pkgRes.data) notFound();

  const pkg = mapPackage(pkgRes.data);
  const destinations = (destRes.data ?? []).map(mapDestination);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/admin/packages" className="text-sm font-semibold text-teal-deep hover:underline">← Packages</Link>
        {pkg.status === 'published' && (
          <Link href={`/packages/${pkg.slug}`} target="_blank" className="text-sm font-semibold text-teal-deep hover:underline">
            View on website ↗
          </Link>
        )}
      </div>
      <h1 className="mt-2 font-serif text-3xl text-ink">{pkg.title}</h1>
      <div className="mt-8">
        <PackageForm pkg={pkg} destinations={destinations} />
      </div>
    </div>
  );
}
