import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import PackageCard from '@/components/PackageCard';
import SectionHeading from '@/components/SectionHeading';
import { getBrand } from '@/lib/brands';
import { getPackagesByBrand } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const brand = getBrand(params.slug);
  if (!brand) return {};
  return { title: brand.name, description: brand.description };
}

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const brand = getBrand(params.slug);
  if (!brand || brand.externalUrl) notFound();

  const packages = brand.sellsPackages ? await getPackagesByBrand(brand.key) : [];

  return (
    <>
      <SiteHeader />
      <section className="relative flex min-h-[64svh] items-end">
        <Image src={brand.heroImage} alt={brand.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/30" />
        <div className="container-site relative pb-14 pt-44 text-white">
          {brand.logoCard ? (
            <Image src={brand.logoCard} alt={brand.name} width={560} height={155} className="h-24 w-auto max-w-full rounded-xl shadow-2xl shadow-ink/40 sm:h-28" />
          ) : (
            <p className="eyebrow !text-teal">Premium Choice</p>
          )}
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{brand.tagline}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">{brand.description}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/plan" className="btn-primary !px-8 !py-4">
              Plan my trip
            </Link>
            <a href="tel:+97144206965" className="btn !border !border-white/40 !px-8 !py-4 text-white hover:!border-teal hover:text-teal">
              Talk to a specialist
            </a>
          </div>
        </div>
      </section>

      {/* Services strip */}
      <div className="border-b border-line bg-sand">
        <div className="container-site flex flex-wrap gap-x-8 gap-y-2 py-5">
          {brand.services.map((s) => (
            <p key={s} className="text-sm font-semibold text-ink-soft">
              <span className="mr-1.5 text-teal">✦</span>
              {s}
            </p>
          ))}
        </div>
      </div>

      <main className="py-16 sm:py-20">
        <div className="container-site">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
            <div>
              <p className="eyebrow">About {brand.shortName}</p>
              <h2 className="mt-2 max-w-xl font-serif text-3xl leading-tight text-ink">{brand.name}</h2>
              <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{brand.longDescription}</p>
            </div>
            <div className="rounded-2xl bg-ink p-7 text-white lg:self-start">
              <h3 className="font-serif text-xl">Start a conversation</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Tell us what you have in mind and a {brand.shortName.toLowerCase()} specialist
                will come back within one working day.
              </p>
              <Link href="/plan" className="btn-primary mt-5 w-full">
                Plan my trip
              </Link>
              <p className="mt-4 text-center text-xs text-white/60">
                or call <a className="font-semibold text-teal" href="tel:+97144206965">+971 4 420 6965</a>
              </p>
            </div>
          </div>

          {packages.length > 0 && (
            <div className="mt-16">
              <SectionHeading
                eyebrow="Chosen for you"
                title={`Featured ${brand.shortName.toLowerCase()}`}
                text="Starting points, not set menus — every itinerary reshapes around you."
              />
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg, i) => (
                  <PackageCard key={pkg.slug} pkg={pkg} priority={i < 3} />
                ))}
              </div>
            </div>
          )}

          {packages.length === 0 && brand.key === 'corporate' && (
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Corporate travel', 'Flights, hotels and ground transport for business travellers — booked, changed and supported by people who know your account.'],
                ['Group travel', 'Conferences, team off-sites and group movements handled end to end, from block bookings to on-the-day logistics.'],
                ['Meetings & events', 'Venues, delegate travel and accommodation for meetings and corporate events in the UAE and abroad.'],
                ['Incentive travel', 'Reward trips that people actually talk about — designed around your team and your budget.'],
                ['Account management', 'One named contact, agreed service levels and clear reporting — not a ticket queue.'],
                ['Out-of-hours support', 'When plans change mid-trip, your travellers reach a person who can fix it.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-line p-6">
                  <h3 className="font-serif text-xl text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
