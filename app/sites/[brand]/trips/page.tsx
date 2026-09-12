import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/staycations/coastal/Icon';
import LocalTrips from '@/components/staycations/coastal/LocalTrips';
import TripActions from '@/components/staycations/coastal/TripActions';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getAccount, getAccountActivity } from '@/lib/account';
import { badgeClass, tripStatus } from '@/lib/staycations/trip-status';
import { boardLabel, roomLabel } from '@/lib/staycations/format';
import { addDays, longDateLabel, todayInDubai, ymd } from '@/lib/staycations/search-criteria';
import { cancellationStanding, changeRequestsFor, tripPayment, type ChangeRequest, type TripPayment } from '@/lib/trips/portal';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Trips',
  description: 'Your stays with Premium Choice Staycations.',
  robots: { index: false, follow: false },
};

const money = (n: unknown, currency: string) =>
  n == null ? '' : `${currency} ${Number(n).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;

export default async function TripsPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const account = await getAccount();
  const activity = account ? await getAccountActivity(account) : null;
  const requests: any[] = activity?.bookings ?? [];
  const today = ymd(todayInDubai());

  // Payment state and past messages for every stay, in two round trips rather
  // than two per card.
  const history = await changeRequestsFor(requests.map((r) => r.id));
  const payments = new Map<number, TripPayment>(
    await Promise.all(requests.map(async (r) => [r.id, await tripPayment(r)] as [number, TripPayment])),
  );

  const upcoming = requests.filter((r) => !r.supplier_cancelled_at && r.check_in >= today);
  const past = requests.filter((r) => r.supplier_cancelled_at || r.check_in < today);

  const card = (r: any) => {
    const payment = payments.get(r.id)!;
    const standing = cancellationStanding(r);
    const past: ChangeRequest[] = history.get(r.id) ?? [];
    const status = tripStatus(r);
    const out = addDays(r.check_in, Number(r.nights) || 1);
    const reference = r.supplier_reference || `PCS-${r.id}`;
    return (
      <li key={r.id} className="cc-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="cc-h4">{r.hotel_name}</h3>
            <p className="cc-support mt-1 flex items-center gap-1.5">
              <Icon name="pin" size={15} className="text-petrol" />
              {r.emirate || 'United Arab Emirates'}
            </p>
          </div>
          <span className={`${badgeClass(status.tone)} shrink-0`}>
            <Icon name={status.icon} size={14} />
            {status.label}
          </span>
        </div>

        <p className="cc-body mt-3 text-sea-soft">{status.detail}</p>

        <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-sea-line pt-4 sm:grid-cols-2">
          <div>
            <dt className="cc-label">Dates</dt>
            <dd className="text-[15px] text-sea-ink">
              {longDateLabel(r.check_in)} → {longDateLabel(out)} · {r.nights} night{r.nights === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt className="cc-label">Guests</dt>
            <dd className="text-[15px] text-sea-ink">
              {r.adults} adult{r.adults === 1 ? '' : 's'}
              {r.children ? `, ${r.children} child${r.children === 1 ? '' : 'ren'}` : ''} · 1 room
            </dd>
          </div>
          {r.room_name && (
            <div>
              <dt className="cc-label">Room</dt>
              <dd className="text-[15px] text-sea-ink">
                {roomLabel(r.room_name)}
                {r.board ? ` · ${boardLabel(r.board)}` : ''}
              </dd>
            </div>
          )}
          <div>
            <dt className="cc-label">Reference</dt>
            <dd className="text-[15px] tabular-nums text-sea-ink">{reference}</dd>
          </div>
          {r.amount != null && (
            <div>
              <dt className="cc-label">Price you were shown</dt>
              <dd className="text-[15px] tabular-nums text-sea-ink">{money(r.amount, r.currency || 'AED')}</dd>
            </div>
          )}
          <div>
            <dt className="cc-label">Cancellation</dt>
            <dd className="text-[15px] text-sea-ink">
              {r.refundable === false
                ? 'Non-refundable'
                : r.cancel_by
                  ? `Free until ${String(r.cancel_by).slice(0, 10)}`
                  : 'Confirmed with your specialist'}
            </dd>
          </div>
        </dl>

        {r.extra_fees && <p className="cc-support mt-3">Payable at the hotel: {r.extra_fees}.</p>}
        {r.rate_comments && <p className="cc-support mt-2 whitespace-pre-line">{r.rate_comments}</p>}

        <TripActions
          bookingId={r.id}
          confirmed={Boolean(r.supplier_reference)}
          cancelled={Boolean(r.supplier_cancelled_at)}
          cancellationText={standing.text}
          payment={payment}
          history={past}
        />
      </li>
    );
  };

  return (
    <div className="cc-wrap py-6 lg:py-10">
      <h1 className="cc-h2">Trips</h1>
      <p className="cc-body mt-1 text-sea-soft">
        Every stay you have with us: what it costs, what is confirmed, and everything you can do about it.
      </p>

      {!account && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-mist p-4">
          <p className="cc-body text-sea-ink">
            Sign in to open your stays: vouchers, payment, changes and cancellations, and a specialist to ask.
          </p>
          <Link href="/account/sign-in?next=/trips" className="cc-btn-primary !min-h-[44px] !px-5 text-[15px]">
            Sign in
          </Link>
        </div>
      )}

      {account && (
        <>
          <section className="mt-6">
            <h2 className="cc-h4">Upcoming</h2>
            {upcoming.length ? (
              <ul className="mt-3 space-y-4">{upcoming.map(card)}</ul>
            ) : (
              <div className="mt-3 rounded-[12px] border border-sea-line p-6 text-center">
                <p className="cc-body text-sea-soft">Nothing booked or pending for the days ahead.</p>
                <Link href={`${base}/hotels`} className="cc-btn-primary mt-4">
                  Find a stay
                </Link>
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="mt-8">
              <h2 className="cc-h4">Past</h2>
              <ul className="mt-3 space-y-4">{past.map(card)}</ul>
            </section>
          )}

          {(activity?.quotes.length ?? 0) > 0 && (
            <p className="cc-support mt-6">
              You also have {activity!.quotes.length} quote{activity!.quotes.length === 1 ? '' : 's'} from us.{' '}
              <Link href="/account" className="font-semibold text-petrol">
                Open them in your account
              </Link>
              .
            </p>
          )}
        </>
      )}

      <LocalTrips base={base} signedIn={Boolean(account)} />
    </div>
  );
}
