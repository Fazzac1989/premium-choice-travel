import Image from 'next/image';
import { notFound } from 'next/navigation';
import PackageDetailBody from '@/components/PackageDetailBody';
import GolfTrip from '@/components/golf/GolfTrip';
import { brandSiteUrl, getBrand } from '@/lib/brands';
import { golfFacts } from '@/lib/golf/catalogue';
import { brandBase } from '@/lib/brand-site';
import { getDestination, getJourneyStays, getPackage, getRelatedJourneys } from '@/lib/data';

export const dynamic = 'force-dynamic';

/**
 * Each journey's own title and description. Without this every brand-site
 * journey inherited the plain brand name as its browser title. The layout's
 * template adds the brand, so a brand suffix authored into seoTitle
 * ("… | Premium Choice Golf") is dropped rather than said twice.
 */
export async function generateMetadata({ params }: { params: { brand: string; slug: string } }) {
  const brand = getBrand(params.brand);
  const pkg = await getPackage(params.slug);
  if (!brand || !pkg || pkg.status !== 'published' || pkg.brand !== brand.key) return {};
  const place = brand.key === 'golf' ? golfFacts(pkg).country : pkg.destinationName;
  const authored = (pkg.seoTitle ?? '').replace(/\s*[|—-]\s*Premium Choice.*$/i, '').trim();
  const kind = brand.key === 'golf' ? 'golf holiday' : 'holiday';
  const title = authored || `${pkg.title} — ${place} ${kind} from the UAE`;
  const description = pkg.seoDescription || pkg.tagline || pkg.overview[0]?.slice(0, 155);
  const site = brandSiteUrl(brand.key);
  return {
    title,
    description,
    alternates: site ? { canonical: `${site}/journeys/${pkg.slug}` } : undefined,
    openGraph: {
      title: `${title} | ${brand.name}`,
      description,
      images: pkg.heroImage ? [{ url: pkg.heroImage }] : undefined,
    },
  };
}

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

  const [relatedAll, stays, destination] = await Promise.all([
    getRelatedJourneys(pkg, 12),
    getJourneyStays(pkg),
    pkg.destinationSlug ? getDestination(pkg.destinationSlug) : Promise.resolve(null),
  ]);
  // Brand sites stay inside their own brand for suggestions.
  const related = relatedAll.filter((p) => p.brand === brand.key).slice(0, brand.key === 'golf' ? 4 : 3);

  if (brand.key === 'golf') {
    return <GolfTrip pkg={pkg} base={base} related={related} hotels={stays.hotels} destination={destination} />;
  }

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
      <PackageDetailBody
        pkg={pkg}
        related={related}
        hrefBase={`${base}/journeys`}
        hotels={stays.hotels}
        experiences={stays.experiences}
        destination={destination}
      />
    </>
  );
}
