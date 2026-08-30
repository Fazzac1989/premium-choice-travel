import { notFound, redirect } from 'next/navigation';
import BookingPage from '@/components/BookingPage';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import { ratesEnabled } from '@/lib/rates';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string; slug: string } }) {
  const hotel = (await getStaycationHotels()).find((h) => hotelSlug(h.name) === params.slug);
  return {
    title: hotel ? `Book ${hotel.name}` : 'Booking request',
    // A live-priced page has nothing to offer a search engine and everything
    // to lose from being crawled — every visit is a supplier search.
    robots: { index: false, follow: false },
  };
}

export default async function HotelBookingPage({
  params,
  searchParams,
}: {
  params: { brand: string; slug: string };
  searchParams: { from?: string; nights?: string; adults?: string; children?: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const hotel = (await getStaycationHotels()).find((h) => hotelSlug(h.name) === params.slug);
  if (!hotel) notFound();

  const hotelHref = `${base}/hotels/${params.slug}`;
  // Nothing to book without a supplier or a date — send them back to the hotel
  // rather than showing an empty page.
  if (!ratesEnabled() || !hotel.supplierCode || !/^\d{4}-\d{2}-\d{2}$/.test(searchParams.from ?? '')) {
    redirect(hotelHref);
  }

  return (
    <BookingPage
      hotelId={hotel.id}
      hotelName={hotel.name}
      emirate={hotel.emirate ?? ''}
      logo={brand.logo}
      hotelHref={hotelHref}
      checkIn={searchParams.from!}
      nights={Math.max(1, Math.min(30, Number(searchParams.nights) || 2))}
      adults={Math.max(1, Math.min(12, Number(searchParams.adults) || 2))}
      children={Math.max(0, Math.min(8, Number(searchParams.children) || 0))}
    />
  );
}
