import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GalleryLightbox from '@/components/GalleryLightbox';
import AvailabilityCheck from '@/components/AvailabilityCheck';
import SaveHotelButton from '@/components/staycations/SaveHotelButton';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import { hotelPhotoSrc, venuePhotoSrc } from '@/lib/images/google-places';
import type { PlacePhotoRef, VenueSection } from '@/lib/types';
import { PRICE_BASIS, priceBand } from '@/lib/price-bands';
import BookingFlow from '@/components/BookingFlow';
import { RATES_PREVIEW_COOKIE, ratesVisible } from '@/lib/rates';
import { cookies } from 'next/headers';

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
  searchParams,
}: {
  params: { brand: string; slug: string };
  searchParams: { from?: string; nights?: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const hotel = (await getStaycationHotels()).find((h) => hotelSlug(h.name) === params.slug);
  if (!hotel) notFound();

  // Real photography of the property first — our cached copies of Google's
  // photos, or the live stream when that is switched on — then anything
  // curated by hand. A photo we cannot serve is simply left out.
  const placePhotos = (hotel.photos ?? [])
    .map((p: PlacePhotoRef) => ({ url: hotelPhotoSrc(p, 1600), alt: hotel.name, credit: p.attribution }))
    .filter((p: { url: string | null; alt: string; credit: string }): p is { url: string; alt: string; credit: string } => Boolean(p.url));
  const galleryImages = [
    ...placePhotos,
    ...hotel.gallery.map((url: string) => ({ url, alt: hotel.name, credit: '' })),
  ];
  // No photograph of this hotel means no photograph: the brand's scenery is
  // a picture of a different, named hotel, and showing it here would be a
  // claim about the wrong building. The branded panel is honest.
  const heroImage = galleryImages[0]?.url || hotel.image || null;
  const hasOwnPhotography = galleryImages.length > 0;
  const credits = Array.from(new Set(placePhotos.map((p: { credit: string }) => p.credit).filter(Boolean)));

  const band = priceBand(hotel.priceBand);
  // An indicative price is offered only when a supplier is connected and this
  // hotel is mapped to it; otherwise the page is exactly as it is today.
  // With a supplier connected and this hotel mapped, the panel becomes a
  // dates → rooms → request flow. Otherwise it stays the enquiry form.
  const canBook =
    ratesVisible(cookies().get(RATES_PREVIEW_COOKIE)?.value === '1') && Boolean(hotel.supplierCode);

  const facts: [string, string][] = [
    ...(hotel.stars ? [['Rating', `${'★'.repeat(hotel.stars)}`] as [string, string]] : []),
    ...(band ? [['Roughly', `${band.label} a night`] as [string, string]] : []),
    ...(hotel.emirate ? [['Emirate', hotel.emirate] as [string, string]] : []),
    ...(hotel.area ? [['Area', hotel.area] as [string, string]] : []),
    ...(hotel.style ? [['Style', hotel.style] as [string, string]] : []),
    ...(hotel.mealPlans.length ? [['Meal plans', hotel.mealPlans.join(' · ')] as [string, string]] : []),
  ];

  return (
    <>
      <section className="relative flex min-h-[56svh] items-end">
        {heroImage ? (
          <Image src={heroImage} alt={hotel.name} fill priority className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-teal-deep/70" />
        )}
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
          <div className="mt-2 flex items-end justify-between gap-4">
            <h1 className="max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{hotel.name}</h1>
            <SaveHotelButton slug={params.slug} name={hotel.name} className="mb-2 shrink-0" />
          </div>
          {!hasOwnPhotography && !heroImage && (
            <p className="mt-2 text-xs text-white/60">Hotel photography coming soon.</p>
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
                    {venuePhotoSrc(r, 800) && (
                      <div className="relative aspect-[16/10] bg-sand">
                        <Image
                          src={venuePhotoSrc(r, 800)!}
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

          {hotel.gettingThere && (
            <div className="mt-12">
              <SectionTitle eyebrow="The journey in" title="Getting there" />
              <div className="mt-5 rounded-2xl bg-sand p-6">
                <p className="text-[15px] leading-relaxed text-ink-soft">{hotel.gettingThere}</p>
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
            <h3 className="font-serif text-xl">
              {canBook ? `Book ${hotel.name}` : `Check dates at ${hotel.name}`}
            </h3>
            {/* The band is guidance for a hotel we price by hand. Once real
                room prices are on the panel it only muddies them. */}
            {!canBook && (band || hotel.priceGuide) && (
              <div className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/85">
                {band && <p className="font-semibold text-teal">{band.long}</p>}
                {hotel.priceGuide && <p className={band ? 'mt-1' : ''}>{hotel.priceGuide}</p>}
                <p className="mt-1 text-[11px] leading-relaxed text-white/50">{PRICE_BASIS}</p>
              </div>
            )}
            <div className="mt-4">
              {canBook ? (
                <BookingFlow
                  hotelName={hotel.name}
                  bookHref={`${base}/hotels/${params.slug}/book`}
                  defaultCheckIn={searchParams.from ?? ''}
                  defaultNights={Number(searchParams.nights) || 2}
                />
              ) : (
                <AvailabilityCheck
                  hotelName={hotel.name}
                  hotelHref={`${base}/hotels/${params.slug}`}
                  emirate={hotel.emirate ?? ''}
                  mealPlans={hotel.mealPlans}
                  defaultCheckIn={searchParams.from ?? ''}
                  defaultNights={Number(searchParams.nights) || 2}
                />
              )}
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
