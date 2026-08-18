import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { BRANDS, PACKAGE_BRANDS, brandLabel } from '@/lib/brands';
import EnquiriesList from '@/components/admin/EnquiriesList';

export const dynamic = 'force-dynamic';

export default async function BrandEnquiriesPage({ params }: { params: { brand: string } }) {
  const brandKey = params.brand;
  if (!PACKAGE_BRANDS.some((b) => b.key === brandKey)) notFound();
  const brand = BRANDS.find((b) => b.key === brandKey)!;

  const db = createAdminClient();
  const [{ data: pkgRows }, { data: enquiryRows }] = await Promise.all([
    db.from('packages').select('id, title').eq('brand', brandKey),
    db.from('enquiries').select('*').order('created_at', { ascending: false }),
  ]);

  const packageIds = new Set((pkgRows ?? []).map((p) => p.id));
  const packageTitles = new Set((pkgRows ?? []).map((p) => p.title));
  const enquiries = (enquiryRows ?? []).filter(
    (e) =>
      (e.package_id && packageIds.has(e.package_id)) ||
      (e.package_title && packageTitles.has(e.package_title)) ||
      e.package_title?.includes(brand.name)
  );
  const rest = (enquiryRows ?? []).length - enquiries.length;

  return (
    <>
      <p className="eyebrow">Premium Choice {brandLabel(brandKey)}</p>
      <h1 className="font-serif text-3xl text-ink">Enquiries</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Enquiries about {brandLabel(brandKey)} packages and from the brand’s website.
        {rest > 0 && (
          <> General enquiries live under{' '}
          <Link href="/admin/enquiries" className="font-semibold text-teal-deep hover:underline">all enquiries</Link>.</>
        )}
      </p>
      <div className="mt-8">
        <EnquiriesList enquiries={enquiries} />
      </div>
    </>
  );
}
