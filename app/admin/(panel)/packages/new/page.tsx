import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapDestination } from '@/lib/data';
import PackageForm from '@/components/admin/PackageForm';

export const dynamic = 'force-dynamic';

export default async function NewPackagePage({
  searchParams,
}: {
  searchParams: { brand?: string };
}) {
  const db = createAdminClient();
  const { data } = await db.from('destinations').select('*').order('sort_order');
  const destinations = (data ?? []).map(mapDestination);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/packages" className="text-sm font-semibold text-teal-deep hover:underline">← Packages</Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">New package</h1>
      <div className="mt-8">
        <PackageForm pkg={null} destinations={destinations} defaultBrand={searchParams.brand} />
      </div>
    </div>
  );
}
