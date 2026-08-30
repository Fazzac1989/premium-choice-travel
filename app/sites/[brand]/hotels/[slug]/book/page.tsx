import { notFound, redirect } from 'next/navigation';
import BookingPage from '@/components/BookingPage';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import { RATES_PREVIEW_COOKIE, ratesVisible } from '@/lib/rates';
import { cookies } from 'next/headers';
import { getAccount } from '@/lib/account';
import { getTravellers } from '@/lib/travellers';

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
  const visible = ratesVisible(cookies().get(RATES_PREVIEW_COOKIE)?.value === '1');
  if (!visible || !hotel.supplierCode || !/^\d{4}-\d{2}-\d{2}$/.test(searchParams.from ?? '')) {
    redirect(hotelHref);
  }

  const nights = Math.max(1, Math.min(30, Number(searchParams.nights) || 2));
  const adults = Math.max(1, Math.min(12, Number(searchParams.adults) || 2));
  const children = Math.max(0, Math.min(8, Number(searchParams.children) || 0));

  // Signed in, we already know who they are and who they travel with, so
  // nobody retypes a name they have given us before. Signed out, the page
  // offers a sign-in rather than demanding one — asking someone to leave for
  // their inbox at the moment they want to book loses the booking.
  const account = await getAccount();
  const travellers = account ? await getTravellers(account.id) : [];

  const here = `${hotelHref}/book?from=${searchParams.from}&nights=${nights}&adults=${adults}&children=${children}`;

  return (
    <BookingPage
      hotelId={hotel.id}
      hotelName={hotel.name}
      emirate={hotel.emirate ?? ''}
      logo={brand.logo}
      hotelHref={hotelHref}
      checkIn={searchParams.from!}
      nights={nights}
      adults={adults}
      children={children}
      account={account ? { email: account.email, fullName: account.fullName, phone: account.phone } : null}
      travellers={travellers.map((t) => ({ id: t.id, fullName: t.fullName, label: t.label }))}
      signInHref={`/account/sign-in?next=${encodeURIComponent(here)}`}
    />
  );
}
