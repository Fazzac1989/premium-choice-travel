import Link from 'next/link';
import { notFound } from 'next/navigation';
import CheckoutScreen from '@/components/staycations/trade/CheckoutScreen';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getAccount } from '@/lib/account';
import { boardName, getQuote, type PlatformQuote } from '@/lib/platform/client';
import { resolveStay } from '@/lib/staycations/stay-search-server';
import { staySearchQuery } from '@/lib/staycations/stay-search';
import { getTravellers, leadTraveller, travelDetailsOnFile } from '@/lib/travellers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Book your stay',
  robots: { index: false, follow: false },
};

/**
 * The checkout for one room whose price was locked on the hotel page (?quote=). Everything shown
 * comes from that quote; the customer adds who is travelling and pays.
 */
export default async function HotelBookingPage({
  params,
  searchParams,
}: {
  params: { brand: string; slug: string };
  searchParams: { quote?: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);
  const stay = await resolveStay(params.slug);
  if (!stay) notFound();
  const hotelHref = `${base}/hotels/${params.slug}`;
  const here = `${hotelHref}/book?quote=${searchParams.quote ?? ''}`;

  const account = await getAccount();
  if (!account)
    return (
      <div className="cc-wrap max-w-xl py-16 text-center">
        <h1 className="cc-h2">Sign in to book</h1>
        <p className="cc-body mt-3 text-sea-soft">Your stays, vouchers and payments live in your account.</p>
        <Link href={`/account/sign-in?next=${encodeURIComponent(here)}`} className="cc-btn-primary mt-6 !rounded-full">
          Sign in or create an account
        </Link>
      </div>
    );

  let quote: PlatformQuote | null = null;
  if (searchParams.quote && /^[0-9a-f-]{36}$/i.test(searchParams.quote)) {
    quote = await getQuote(searchParams.quote).catch(() => null);
  }
  if (!quote || quote.status === 'consumed' || quote.status === 'released' || (stay.platformId && quote.hotel.id.toLowerCase() !== stay.platformId)) {
    return (
      <div className="cc-wrap max-w-xl py-16 text-center">
        <h1 className="cc-h2">{quote?.status === 'consumed' ? 'This room is already booked' : 'Choose your room again'}</h1>
        <p className="cc-body mt-3 text-sea-soft">
          {quote?.status === 'consumed'
            ? 'You will find it under My trips.'
            : 'The price we held for this room has ended. Pick the room again to see today’s price.'}
        </p>
        <Link href={quote?.status === 'consumed' ? `${base}/trips` : hotelHref} className="cc-btn-primary mt-6 !rounded-full">
          {quote?.status === 'consumed' ? 'My trips' : `Back to ${stay.name}`}
        </Link>
      </div>
    );
  }

  const travellers = await getTravellers(account.id);
  const lead = leadTraveller(travellers);
  const image = stay.curated?.gallery?.[0] || stay.curated?.image || stay.content?.images[0] || null;
  const backToHotel = `${hotelHref}${staySearchQuery({
    checkIn: quote.checkIn,
    nights: quote.nights,
    adults: quote.adults,
    childAges: quote.childAges,
  })}`;

  return (
    <CheckoutScreen
      base={base}
      hotelHref={backToHotel}
      here={here}
      image={image}
      account={{ email: account.email, fullName: account.fullName || lead?.fullName || '', phone: account.phone }}
      travellers={travellers.map((t) => ({ id: t.id, fullName: t.fullName, label: t.label }))}
      profileComplete={travelDetailsOnFile(travellers)}
      quote={{
        id: quote.id,
        hotelName: quote.hotel.name,
        city: quote.hotel.city,
        roomName: quote.roomName,
        board: boardName(quote.board),
        checkIn: quote.checkIn,
        nights: quote.nights,
        adults: quote.adults,
        childAges: quote.childAges,
        refundable: quote.refundable,
        refundDeadline: quote.refundDeadline,
        total: quote.price.total.amount / 100,
        perNight: quote.price.perNight.amount / 100,
        currency: quote.price.total.currency,
        expiresAt: quote.expiresAt,
      }}
    />
  );
}
