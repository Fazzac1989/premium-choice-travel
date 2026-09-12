import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import AvailabilityCheck from '@/components/AvailabilityCheck';
import Icon from '@/components/staycations/coastal/Icon';
import StayDetail from '@/components/staycations/coastal/StayDetail';
import StayGallery from '@/components/staycations/coastal/StayGallery';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import { hotelPhotoSrc } from '@/lib/images/google-places';
import { priceBand } from '@/lib/price-bands';
import { RATES_PREVIEW_COOKIE, getOffers, ratesVisible } from '@/lib/rates';
import { toPublicOffer } from '@/lib/rates/types';
import type { PlacePhotoRef, VenueSection } from '@/lib/types';
import {
  criteriaQuery,
  dateRangeLabel,
  missingChildAges,
  parseCriteria,
  priceBasis,
} from '@/lib/staycations/search-criteria';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string; slug: string } }) {
  const hotel = (await getStaycationHotels()).find((h) => hotelSlug(h.name) === params.slug);
  if (!hotel) return {};
  return {
    title: `${hotel.name}${hotel.emirate ? ` — ${hotel.emirate}` : ''}`,
    description:
      hotel.description || hotel.intro[0]?.slice(0, 155) || `${hotel.name}, one of the UAE hotels our specialists rate.`,
  };
}

export default async function StayPage({
  params,
  searchParams,
}: {
  params: { brand: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const hotel = (await getStaycationHotels()).find((h) => hotelSlug(h.name) === params.slug);
  if (!hotel) notFound();

  const criteria = parseCriteria(searchParams);
  const canSeeRates = ratesVisible(cookies().get(RATES_PREVIEW_COOKIE)?.value === '1');
  const agesMissing = missingChildAges(criteria);
  const wantsRates = canSeeRates && Boolean(criteria.checkIn) && !agesMissing && criteria.rooms === 1;

  const offers = wantsRates
    ? (
        await getOffers({
          hotelId: hotel.id,
          supplierCode: hotel.supplierCode ?? null,
          checkIn: criteria.checkIn,
          nights: criteria.nights,
          adults: criteria.adults,
          children: criteria.childrenAges.length,
          childrenAges: criteria.childrenAges,
        })
      ).map(toPublicOffer)
    : [];

  // Real photographs of this property only — our own cached copies of the
  // hotel's Google photos, then anything curated by hand.
  type Shot = { url: string; alt: string; credit: string };
  const placePhotos: Shot[] = ((hotel.photos ?? []) as PlacePhotoRef[])
    .map((p) => ({ url: hotelPhotoSrc(p, 1600) ?? '', alt: hotel.name, credit: p.attribution }))
    .filter((p) => Boolean(p.url));
  const images: { url: string; alt: string }[] = [
    ...placePhotos.map((p) => ({ url: p.url, alt: p.alt })),
    ...((hotel.gallery ?? []) as string[]).map((url) => ({ url, alt: hotel.name })),
  ];
  const credits: string[] = Array.from(new Set(placePhotos.map((p) => p.credit).filter(Boolean)));

  const ratesNotice = agesMissing
    ? 'Add each child’s age to see prices — hotels price children by age.'
    : criteria.rooms > 1
      ? 'We confirm one room at a time online; a specialist prices multi-room stays.'
      : !canSeeRates
        ? 'Live prices are in testing. A specialist confirms the exact rate for your dates.'
        : !criteria.checkIn
          ? null
          : offers.length === 0
            ? 'Nothing came back for these dates. Try other nights, or ask us to look properly.'
            : null;

  return (
    <div className="pb-6">
      <div className="lg:cc-wrap lg:pt-6">
        <StayGallery
          images={images}
          credits={credits}
          name={hotel.name}
          location={[hotel.emirate, hotel.area].filter(Boolean).join(' · ')}
          slug={params.slug}
          backHref={`${base}/hotels${criteriaQuery(criteria)}`}
        />
      </div>

      <div className="cc-wrap pt-5">
        {/* A quiet fact strip, the way the property itself would describe it. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-4">
          {hotel.stars ? (
            <span className="text-[14px] tracking-[0.1em] text-petrol" aria-label={`${hotel.stars} star hotel`}>
              {'★'.repeat(hotel.stars)}
            </span>
          ) : null}
          {hotel.style && <span className="cc-support">{hotel.style}</span>}
          {priceBand(hotel.priceBand) && !offers.length && (
            <span className="cc-support">Guide {priceBand(hotel.priceBand)!.label} a night</span>
          )}
        </div>

        <StayDetail
          base={base}
          hotelName={hotel.name}
          offers={offers}
          roomTypes={hotel.roomTypes}
          intro={hotel.intro.length ? hotel.intro : [hotel.description].filter(Boolean)}
          features={hotel.features}
          restaurants={(hotel.restaurants as VenueSection[]).map((r) => ({ heading: r.heading, body: r.body }))}
          gettingThere={hotel.gettingThere}
          mealPlans={hotel.mealPlans}
          stars={hotel.stars ?? null}
          style={hotel.style}
          bandLabel={priceBand(hotel.priceBand)?.label ?? null}
          basis={priceBasis(criteria)}
          nights={criteria.nights}
          dateLabel={dateRangeLabel(criteria)}
          hasDates={Boolean(criteria.checkIn)}
          canBook={offers.length > 0}
          bookHref={`${base}/hotels/${params.slug}/book${criteriaQuery(criteria)}`}
          ratesNotice={ratesNotice}
        />

        {/* The route for anyone we cannot price online: a real person. */}
        <section id="ask" className="mt-10 scroll-mt-20">
          <div className="rounded-[12px] bg-petrol-deep p-5 text-white lg:max-w-lg">
            <h2 className="cc-h4 text-white">
              {offers.length > 0 ? `Can't find what you are looking for at ${hotel.name}?` : `Ask about ${hotel.name}`}
            </h2>
            <p className="mt-1 text-[14px] leading-[20px] text-white/70">
              {offers.length > 0
                ? 'Another room type, a longer stay, more than one room, or a date that is not showing — send it over and a specialist replies with what is available and what it costs, usually the same working day.'
                : 'Send your dates and a specialist replies with what is available and what it costs — usually the same working day.'}
            </p>
            <div className="mt-4">
              <AvailabilityCheck
                hotelName={hotel.name}
                hotelHref={`${base}/hotels/${params.slug}`}
                emirate={hotel.emirate ?? ''}
                mealPlans={hotel.mealPlans}
                defaultCheckIn={criteria.checkIn}
                defaultNights={criteria.nights}
              />
            </div>
          </div>
          <p className="cc-support mt-3">
            Prefer to talk?{' '}
            <a href="tel:+97144206965" className="font-semibold text-petrol">
              +971 4 420 6965
            </a>{' '}
            · or see{' '}
            <Link href={`${base}/hotels${criteriaQuery(criteria)}`} className="font-semibold text-petrol">
              other stays
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
