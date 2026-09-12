import { notFound, redirect } from 'next/navigation';
import BookingPage from '@/components/BookingPage';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import { RATES_PREVIEW_COOKIE, ratesVisible } from '@/lib/rates';
import { cookies } from 'next/headers';
import { getAccount } from '@/lib/account';
import { getTravellers, leadTraveller, travelDetailsOnFile } from '@/lib/travellers';

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
  searchParams: { from?: string; nights?: string; adults?: string; children?: string; ages?: string; offer?: string };
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
  const childrenAges = String(searchParams.ages ?? '')
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((n) => Math.max(0, Math.min(17, Number(n))))
    .slice(0, children);

  // A booking belongs to an account now. The page asks for an email it can
  // prove, then for the name and date of birth a hotel will check them in
  // against — once, and never again. The sign-in link returns to this URL, so
  // the room and price they chose survive the round trip to their inbox.
  const account = await getAccount();
  const travellers = account ? await getTravellers(account.id) : [];
  // One saved traveller with a name and a date of birth is enough. Requiring
  // the profile's own name as well asked people who had added their family on
  // the travellers screen to type it all again.
  const profileComplete = travelDetailsOnFile(travellers);
  const lead = leadTraveller(travellers);
  const bookingName = account?.fullName || lead?.fullName || '';

  const here =
    `${hotelHref}/book?from=${searchParams.from}&nights=${nights}&adults=${adults}&children=${children}` +
    (childrenAges.length ? `&ages=${childrenAges.join(',')}` : '');

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
      childrenAges={childrenAges}
      preselectOfferId={searchParams.offer ?? ''}
      account={account ? { email: account.email, fullName: bookingName, phone: account.phone } : null}
      travellers={travellers.map((t) => ({ id: t.id, fullName: t.fullName, label: t.label }))}
      profileComplete={profileComplete}
      here={here}
    />
  );
}
