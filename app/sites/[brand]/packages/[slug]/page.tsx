import Image from 'next/image';
import { notFound } from 'next/navigation';
import PackageDetailBody from '@/components/PackageDetailBody';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getPackage, getPackagesByBrand } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function BrandPackagePage({
  params,
}: {
  params: { brand: string; slug: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();
  const base = brandBase(brand);

  const pkg = await getPackage(params.slug);
  if (!pkg || pkg.status !== 'published' || pkg.brand !== brand.key) notFound();

  const related = (await getPackagesByBrand(brand.key))
    .filter((p) => p.slug !== pkg.slug)
    .slice(0, 3);

  return (
    <>
      <section className="relative flex min-h-[56svh] items-end">
        <Image src={pkg.heroImage} alt={pkg.title} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-site relative pb-12 pt-36 text-white">
          <p className="eyebrow !text-teal">
            {pkg.destinationName} · {pkg.category}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{pkg.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{pkg.tagline}</p>
        </div>
      </section>
      <PackageDetailBody pkg={pkg} related={related} hrefBase={`${base}/packages`} />
    </>
  );
}
