import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapPackage } from '@/lib/data';
import { BRANDS, PACKAGE_BRANDS } from '@/lib/brands';
import PackagesTable from '@/components/admin/PackagesTable';

export const dynamic = 'force-dynamic';

export default async function BrandWorkspacePage({ params }: { params: { brand: string } }) {
  const brandKey = params.brand;
  if (!PACKAGE_BRANDS.some((b) => b.key === brandKey)) notFound();
  const brand = BRANDS.find((b) => b.key === brandKey)!;

  const db = createAdminClient();
  const [{ data: pkgRows }, { data: enquiryRows }] = await Promise.all([
    db.from('packages').select('*, destinations(slug, name, region)').eq('brand', brandKey).order('updated_at', { ascending: false }),
    db.from('enquiries').select('id, name, email, package_title, status, created_at').order('created_at', { ascending: false }).limit(30),
  ]);

  const packages = (pkgRows ?? []).map(mapPackage);
  const live = packages.filter((p) => p.status === 'published').length;
  const drafts = packages.length - live;
  const liveUrl = brand.domains[0] ? `https://${brand.domains[0]}` : `/sites/${brand.slug}`;
  // Enquiries whose package title matches one of this brand's packages or mentions the brand.
  const titles = new Set(packages.map((p) => p.title));
  const brandEnquiries = (enquiryRows ?? []).filter(
    (e) => (e.package_title && titles.has(e.package_title)) || e.package_title?.includes(brand.name)
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {brand.logoCard ? (
            <Image src={brand.logoCard} alt={brand.name} width={420} height={116} className="h-14 w-auto rounded-lg border border-line object-contain" />
          ) : (
            <h1 className="font-serif text-3xl text-ink">{brand.name}</h1>
          )}
          <p className="mt-2 text-sm text-ink-soft">
            {brand.tagline} {brand.domains[0] && <>· live at <span className="font-semibold">{brand.domains[0]}</span></>}
          </p>
        </div>
        <div className="flex gap-3">
          <a href={liveUrl} target="_blank" rel="noopener" className="btn-outline !bg-white">View site ↗</a>
          <Link href={`/admin/packages/new?brand=${brandKey}`} className="btn-primary">New package</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {[
          { label: 'Live packages', value: live, href: `/admin/brands/${brandKey}/packages` },
          { label: 'Drafts', value: drafts, href: `/admin/brands/${brandKey}/packages` },
          { label: 'Recent brand enquiries', value: brandEnquiries.length, href: '/admin/enquiries' },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="card p-6 transition-shadow hover:shadow-lg">
            <p className="font-serif text-4xl text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">Latest packages</h2>
          <Link href={`/admin/brands/${brandKey}/packages`} className="text-sm font-semibold text-teal-deep hover:underline">
            All {brand.shortName.toLowerCase()} packages →
          </Link>
        </div>
        <div className="mt-4">
          <PackagesTable packages={packages.slice(0, 6)} showBrand={false} />
        </div>
      </div>
    </>
  );
}
