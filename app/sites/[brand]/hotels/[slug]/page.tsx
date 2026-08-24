import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GalleryLightbox from '@/components/GalleryLightbox';
import AvailabilityCheck from '@/components/AvailabilityCheck';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import { placePhotoSrc } from '@/lib/images/google-places';
import type { PlacePhotoRef, VenueSection } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string; slug: string } }) {
  const hotel = (await getStaycationHotels()).find((h) => hotelSlug(h.name) === params.slug);
  if (!hotel) return {};
  return {
    title: `${hotel.name}${hotel.emirate ? ` — ${hotel.emirate}` : ''}`,
    description: hotel.description || hotel.intro[0]?.slice(0, 155) || `${hotel.name}, one of the UAE hotels our specialists rate.`,
  };
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-3xl text-ink">{title}</h2>
    </>
  );
}

export default async function StaycationHotelPage({
  params,
}: {
  params: { brand: string; slug: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const hotel = (await getStaycationHotels()).find((h) => hotelSlug(h.name) === params.slug);
  if (!hotel) notFound();

  // Real photography of the property, then anything curated by hand, then a
  // scenic fallback that the page labels honestly as scenery.
  const placePhotos = (hotel.photos ?? []).map((p: PlacePhotoRef) => ({
    url: placePhotoSrc(p.name, 1600),
    alt: hotel.name,
    credit: p.attribution,
  }));
  const galleryImages = [
    ...placePhotos,
    ...hotel.gallery.map((url: string) => ({ url, alt: hotel.name, credit: '' })),
  ];
  const heroImage = galleryImages[0]?.url || hotel.image || brand.heroImage;
  const hasOwnPhotography = galleryImages.length > 0;
  const credits = Array.from(new Set(placePhotos.map((p: { credit: string }) => p.credit).filter(Boolean)));

  const facts: [string, string][] = [
    ...(hotel.stars ? [['Rating', `${'★'.repeat(hotel.stars)}`] as [string, string]] : []),
    ...(hotel.emirate ? [['Emirate', hotel.emirate] as [string, string]] : []),
    ...(hotel.area ? [['Area', hotel.area] as [string, string]] : []),
    ...(hotel.style ? [['Style', hotel.style] as [string, string]] : []),
    ...(hotel.mealPlans.length ? [['Meal plans', hotel.mealPlans.join(' · ')] as [string, string]] : []),
  ];

  return (
    <>
      <section className="relative flex min-h-[56svh] items-end">
        <Image src={heroImage} alt={hotel.name} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-ink/30" />
        <div className="container-site relative pb-12 pt-36 text-white">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <Link href={base || '/'} className="hover:text-teal">Home</Link> ›{' '}
            <Link href={`${base}/hotels`} className="hover:text-teal">Hotels</Link> ›{' '}
            <span className="text-white">{hotel.name}</span>
          </nav>
          <p className="eyebrow mt-4 !text-teal">
            {[hotel.emirate, hotel.area, hotel.style].filter(Boolean).join(' · ')}
          </p>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{hotel.name}</h1>
          {!hasOwnPhotography && (
            <p className="mt-2 text-xs text-white/60">Scenic photography shown — hotel imagery coming soon.</p>
          )}
        </div>
      </section>

      {facts.length > 0 && (
        <div className="border-b border-line bg-sand">
          <div className="container-site flex flex-wrap gap-x-12 gap-y-4 py-5">
            {facts.map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="container-site grid gap-14 py-14 lg:grid-cols-[1fr_360px] lg:gap-20">
        <div className="min-w-0">
          <SectionTitle eyebrow="Our take" title={`Why we rate ${hotel.name}`} />
          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-soft">
            {(hotel.intro.length ? hotel.intro : [hotel.description]).filter(Boolean).map((para: string, i: number) => (
              <p key={i} className={i === 0 ? 'font-serif text-xl leading-relaxed text-ink' : ''}>
                {para}
              </p>
            ))}
            {!hotel.intro.length && !hotel.description && (
              <p>Our specialists know this property first-hand — ask us where it fits in your plans.</p>
            )}
          </div>

          {hotel.features.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="At a glance" title="Features" />
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {hotel.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-sand px-4 py-3 text-sm text-ink">
                    <span className="mt-0.5 text-teal">✦</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hotel.roomTypes.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="Sleep" title="Room types" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {hotel.roomTypes.map((r: { heading: string; body: string }, i: number) => (
                  <div key={i} className="rounded-2xl border border-line p-5">
                    <h3 className="font-serif text-lg text-teal-deep">{r.heading}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{r.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Room categories and configurations are confirmed by your specialist for your dates and party.
              </p>
            </div>
          )}

          {hotel.restaurants.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="Eat & drink" title="Restaurants & bars" />
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {hotel.restaurants.map((r: VenueSection, i: number) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-line">
                    {r.photo && (
                      <div className="relative aspect-[16/10] bg-sand">
                        <Image
                          src={placePhotoSrc(r.photo, 800)}
                          alt={r.heading}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-serif text-xl text-ink">{r.heading}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{r.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(hotel.gettingThere || hotel.transferDuration) && (
            <div className="mt-12">
              <SectionTitle eyebrow="The journey in" title="Getting there" />
              <div className="mt-5 rounded-2xl bg-sand p-6">
                {hotel.gettingThere && (
                  <p className="text-[15px] leading-relaxed text-ink-soft">{hotel.gettingThere}</p>
                )}
                {hotel.transferDuration && (
                  <p className="mt-2 text-sm font-semibold text-teal-deep">Drive time: {hotel.transferDuration}</p>
                )}
              </div>
            </div>
          )}

          {galleryImages.length > 0 && (
            <div className="mt-12">
              <SectionTitle eyebrow="Gallery" title={`${hotel.name}, in pictures`} />
              <div className="mt-7">
                <GalleryLightbox
                  images={galleryImages.map(({ url, alt }) => ({ url, alt }))}
                  title={hotel.name}
                />
              </div>
              {credits.length > 0 && (
                <p className="mt-3 text-xs text-ink-soft">
                  Photography via Google — {credits.slice(0, 6).join(', ')}
                  {credits.length > 6 ? ' and others' : ''}.
                </p>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-ink p-7 text-white">
            <h3 className="font-serif text-xl">Check dates at {hotel.name}</h3>
            {hotel.priceGuide && (
              <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/85">
                <span className="font-semibold text-teal">Guide: </span>
                {hotel.priceGuide}
                <span className="block text-[11px] text-white/50">Guidance only — your price is confirmed when we quote.</span>
              </p>
            )}
            <div className="mt-4">
              <AvailabilityCheck hotelName={hotel.name} emirate={hotel.emirate ?? ''} mealPlans={hotel.mealPlans} />
            </div>
            <p className="mt-4 text-center text-xs text-white/60">
              or call <a className="font-semibold text-teal" href="tel:+97144206965">+971 4 420 6965</a>
            </p>
          </div>
          <Link href={`${base}/hotels`} className="block rounded-2xl border border-line p-6 text-center text-sm font-bold text-teal-deep hover:bg-sand">
            ← All UAE hotels
          </Link>
        </aside>
      </main>
    </>
  );
}
