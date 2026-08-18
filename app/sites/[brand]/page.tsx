import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PackageCard from '@/components/PackageCard';
import SectionHeading from '@/components/SectionHeading';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getPackagesByBrand } from '@/lib/data';

export const dynamic = 'force-dynamic';

const CORPORATE_SERVICES = [
  ['Corporate travel', 'Flights, hotels and ground transport for business travellers — booked, changed and supported by people who know your account.'],
  ['Group travel', 'Conferences, team off-sites and group movements handled end to end.'],
  ['Meetings & events', 'Venues, delegate travel and accommodation in the UAE and abroad.'],
  ['Incentive travel', 'Reward trips people actually talk about — designed around your team.'],
  ['Account management', 'One named contact, agreed service levels and clear reporting.'],
  ['Out-of-hours support', 'When plans change mid-trip, your travellers reach a person who can fix it.'],
];

export default async function BrandHomePage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl) notFound();
  const base = brandBase(brand);

  const packages = brand.sellsPackages ? await getPackagesByBrand(brand.key, 6) : [];

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[80svh] items-center">
        <Image src={brand.heroImage} alt={brand.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/25 to-ink/70" />
        <div className="container-site relative py-20 text-white">
          {brand.logoCard && (
            <Image
              src={brand.logoCard}
              alt={brand.name}
              width={560}
              height={155}
              priority
              className="mb-7 h-24 w-auto max-w-full rounded-xl shadow-2xl shadow-ink/40 sm:h-28"
            />
          )}
          <p className="eyebrow !text-teal">A Premium Choice Travel brand</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl">{brand.tagline}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">{brand.description}</p>
          <div className="mt-9 flex flex-wrap gap-4">
            {brand.sellsPackages && (
              <Link href={`${base}/packages`} className="btn-primary !px-8 !py-4 !text-base">
                {brand.cta}
              </Link>
            )}
            <Link
              href={`${base}/enquire`}
              className="btn !border !border-white/40 !px-8 !py-4 !text-base text-white hover:!border-teal hover:text-teal"
            >
              Talk to a specialist
            </Link>
          </div>
        </div>
      </section>

      {/* Intro + services */}
      <section className="py-16 sm:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="eyebrow">About {brand.shortName}</p>
            <h2 className="mt-2 max-w-xl font-serif text-3xl leading-tight text-ink sm:text-4xl">
              {brand.name}
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{brand.longDescription}</p>
          </div>
          <ul className="grid content-start gap-3">
            {brand.services.map((s) => (
              <li key={s} className="flex items-center gap-3 rounded-xl bg-sand px-4 py-3 text-sm font-semibold text-ink">
                <span className="text-teal">✦</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Packages or corporate services */}
      {packages.length > 0 && (
        <section className="bg-sand py-16 sm:py-20">
          <div className="container-site">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading eyebrow="Chosen for you" title="Our featured trips" />
              <Link href={`${base}/packages`} className="btn-outline shrink-0 !bg-white">
                View all trips
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg, i) => (
                <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} hrefBase={`${base}/packages`} />
              ))}
            </div>
          </div>
        </section>
      )}

      {brand.key === 'corporate' && (
        <section className="bg-sand py-16 sm:py-20">
          <div className="container-site">
            <SectionHeading eyebrow="What we do" title="Corporate travel, end to end" />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CORPORATE_SERVICES.map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-line bg-white p-6">
                  <h3 className="font-serif text-xl text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="container-site">
          <div className="relative overflow-hidden rounded-3xl">
            <Image src={brand.heroImage} alt="" fill className="object-cover" sizes="(max-width: 1240px) 100vw, 1240px" />
            <div className="absolute inset-0 bg-ink/65" />
            <div className="relative px-8 py-14 text-center text-white sm:px-16 sm:py-16">
              <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
                Let’s make it happen.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/80">
                Tell us what you have in mind — a specialist replies typically within one working day.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-4">
                <Link href={`${base}/enquire`} className="btn-primary !px-8 !py-3.5">
                  Start planning
                </Link>
                <a href="tel:+97144206965" className="btn !border !border-white/40 !px-8 !py-3.5 text-white hover:!border-teal hover:text-teal">
                  +971 4 420 6965
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
