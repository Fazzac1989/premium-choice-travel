import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/staycations/coastal/Icon';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getAccount } from '@/lib/account';
import { ownedBooking } from '@/lib/trips/portal';
import { syncPlatformTrip } from '@/lib/platform/trips';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your booking',
  robots: { index: false, follow: false },
};

/**
 * Where the payment page sends the customer back (founder, 2026-10-02). Coming back proves
 * nothing by itself, so this asks the platform, which asks the payment provider: the stay is
 * booked once the card is held, and only then is the money taken. While that is happening the
 * page looks again every few seconds.
 */
export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: { b?: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);
  const account = await getAccount();
  if (!account)
    return (
      <div className="cc-wrap py-16 text-center">
        <h1 className="cc-h2">Sign in to see your booking</h1>
        <Link href={`/account/sign-in?next=${encodeURIComponent(`/trips/confirm?b=${searchParams.b ?? ''}`)}`} className="cc-btn-primary mt-6">
          Sign in
        </Link>
      </div>
    );
  const booking = await ownedBooking(Number(searchParams.b), account);
  if (!booking) notFound();
  const sync = await syncPlatformTrip(booking);

  if (sync.state === 'confirmed')
    return (
      <div className="cc-wrap max-w-2xl py-12 text-center">
        <span className="cc-badge-ok mx-auto">
          <Icon name="check" size={16} />
          Booked and paid
        </span>
        <h1 className="cc-h2 mt-4">Your stay at {booking.hotel_name} is booked</h1>
        <p className="cc-body mt-3 text-sea-soft">
          Your booking reference is <span className="font-semibold text-sea-ink">{sync.reference}</span>. We have
          emailed your confirmation and voucher to {account.email}.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`${base}/trips`} className="cc-btn-primary">
            View my trips
          </Link>
          <a href={`/api/trips/${booking.id}/voucher`} target="_blank" rel="noopener noreferrer" className="cc-btn-quiet">
            Open the voucher
          </a>
        </div>
      </div>
    );

  if (sync.state === 'failed')
    return (
      <div className="cc-wrap max-w-2xl py-12 text-center">
        <h1 className="cc-h2">We could not book this stay</h1>
        <p className="cc-body mt-3 text-sea-soft">
          {sync.message ?? 'The room could not be confirmed.'} Your card was not charged: any amount your bank shows as
          held is released.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`${base}/hotels`} className="cc-btn-primary">
            Find another stay
          </Link>
          <a href="tel:+97144206965" className="cc-btn-quiet">
            Call us
          </a>
        </div>
      </div>
    );

  if (sync.state === 'attention')
    return (
      <div className="cc-wrap max-w-2xl py-12 text-center">
        <h1 className="cc-h2">We are confirming your stay with the hotel</h1>
        <p className="cc-body mt-3 text-sea-soft">
          Your payment is held, not taken, while we finish confirming {booking.hotel_name}. Our team is on it and will
          email you shortly. You do not need to book again.
        </p>
        <Link href={`${base}/trips`} className="cc-btn-primary mt-8">
          View my trips
        </Link>
      </div>
    );

  return (
    <div className="cc-wrap max-w-2xl py-12 text-center">
      {/* look again in a few seconds: the booking is being made now */}
      <meta httpEquiv="refresh" content="3" />
      <h1 className="cc-h2">Confirming your booking…</h1>
      <p className="cc-body mt-3 text-sea-soft">
        We are booking {booking.hotel_name} now. This page updates by itself in a few seconds. Please do not pay
        again.
      </p>
    </div>
  );
}
