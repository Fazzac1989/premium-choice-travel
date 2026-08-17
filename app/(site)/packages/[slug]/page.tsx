import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import EnquiryForm from '@/components/EnquiryForm';
import PackageCard from '@/components/PackageCard';
import { getPackage, getPackagesForDestination } from '@/lib/data';
import { durationLabel, formatPrice } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PackagePage({ params }: { params: { slug: string } }) {
  const pkg = await getPackage(params.slug);
  if (!pkg || pkg.status !== 'published') notFound();

  const related = (await getPackagesForDestination(pkg.destinationSlug))
    .filter((p) => p.slug !== pkg.slug)
    .slice(0, 3);

  return (
    <>
      <SiteHeader />
      {/* Hero */}
      <section className="relative flex min-h-[62svh] items-end">
        <Image src={pkg.heroImage} alt={pkg.title} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-site relative pb-12 pt-40 text-white">
          <p className="eyebrow !text-teal">
            <Link href={`/destinations/${pkg.destinationSlug}`} className="hover:underline">
              {pkg.destinationName}
            </Link>{' '}
            · {pkg.category}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{pkg.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{pkg.tagline}</p>
        </div>
      </section>

      {/* Facts bar */}
      <div className="border-b border-line bg-sand">
        <div className="container-site flex flex-wrap gap-x-12 gap-y-4 py-5">
          {[
            ['Duration', durationLabel(pkg)],
            ...(pkg.hotelName ? [['Stay', pkg.hotelName] as [string, string]] : []),
            ...(pkg.boardBasis ? [['Board', pkg.boardBasis] as [string, string]] : []),
            ...(pkg.priceFrom !== null
              ? [['From', `${formatPrice(pkg.currency, pkg.priceFrom)} per person`] as [string, string]]
              : []),
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{label}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <main className="container-site grid gap-14 py-14 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div className="min-w-0">
          {/* Overview */}
          <section>
            <p className="eyebrow">The trip</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">Overview</h2>
            <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-soft">
              {pkg.overview.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* Highlights */}
          {pkg.highlights.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Highlights</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {pkg.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-sand px-4 py-3 text-sm text-ink">
                    <span className="mt-0.5 text-teal">✦</span>
                    {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Itinerary */}
          {pkg.itinerary.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Day by day</h2>
              <ol className="mt-6 space-y-0">
                {pkg.itinerary.map((day, i) => (
                  <li key={i} className="relative border-l-2 border-teal/30 pb-8 pl-6 last:pb-0">
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-teal" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-deep">{day.label}</p>
                    <h3 className="mt-1 font-semibold text-ink">{day.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{day.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Includes / excludes */}
          <section className="mt-12 grid gap-8 sm:grid-cols-2">
            <div className="rounded-2xl border border-teal/30 bg-teal/5 p-6">
              <h3 className="font-serif text-xl text-teal-deep">What’s included</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-ink">
                {pkg.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 font-bold text-teal">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line p-6">
              <h3 className="font-serif text-xl text-ink">Not included</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
                {pkg.excludes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Gallery */}
          {pkg.gallery.length > 1 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-ink">Gallery</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {pkg.gallery.map((src, i) => (
                  <div key={i} className={`relative overflow-hidden rounded-xl ${i === 0 ? 'col-span-2 row-span-2 aspect-square sm:aspect-[4/3]' : 'aspect-[4/3]'}`}>
                    <Image src={src} alt={`${pkg.title} — photo ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-7">
            {pkg.priceFrom !== null && (
              <div className="mb-5 border-b border-line pb-5">
                <p className="text-xs text-ink-soft">From</p>
                <p className="font-serif text-4xl text-ink">
                  {formatPrice(pkg.currency, pkg.priceFrom)}
                  <span className="ml-1 font-sans text-sm text-ink-soft">per person</span>
                </p>
                <p className="mt-1 text-xs text-ink-soft">{durationLabel(pkg)} · flights quoted separately</p>
              </div>
            )}
            <h3 className="font-serif text-xl text-ink">Make this trip yours</h3>
            <p className="mb-5 mt-1.5 text-sm text-ink-soft">
              Send an enquiry and a specialist will tailor dates, rooms and price to you.
            </p>
            <EnquiryForm packageId={pkg.id} packageTitle={pkg.title} compact />
          </div>
        </aside>
      </main>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-line bg-sand py-16">
          <div className="container-site">
            <h2 className="font-serif text-3xl text-ink">More in {pkg.destinationName}</h2>
            <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PackageCard key={p.slug} pkg={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
