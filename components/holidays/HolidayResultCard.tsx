import Image from 'next/image';
import Link from 'next/link';
import type { HolidayResult } from '@/lib/holidays/holiday-search';
import { depositAmount, depositFor } from '@/lib/holidays/deposit';

/**
 * One holiday in the list, in the package-holiday idiom (founder, 2026-10-04).
 *
 * The price is the loudest thing on the card, because that is what a UAE family
 * compares on. Everything else earns its place or goes.
 *
 * What it does not do is invent urgency. A bed bank tells us whether a rate is
 * on allotment, not how many rooms are left, so there is no honest "only 3
 * left" to print here. The badges below are facts the supplier actually sent:
 * the board, whether it can be cancelled, the star rating. When flights go
 * live, Duffel does return a seat count, and that one is real enough to show.
 */

const aed = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
});

function Stars({ count }: { count: number }) {
  return (
    <span className="text-sun-deep" aria-label={`${count} star`}>
      {'★'.repeat(count)}
    </span>
  );
}

function Badge({ tone = 'plain', children }: { tone?: 'plain' | 'deal'; children: React.ReactNode }) {
  const look =
    tone === 'deal'
      ? 'bg-deal-bg text-deal-ink'
      : 'bg-cloud text-slate-soft';
  return (
    <span className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${look}`}>{children}</span>
  );
}

export default function HolidayResultCard({
  result,
  travellers,
  params,
}: {
  result: HolidayResult;
  travellers: number;
  /** The search this result came from, carried so the hotel can be re-priced. */
  params: Record<string, string>;
}) {
  const { room, flight } = result;
  // A hotel-only search asked for a room, so its price is not "hotel only" —
  // that phrase only means something against a package the flight is missing from.
  const hotelOnlySearch = params.mode === 'hotel';
  const href = `/search/${result.platformHotelId}?${new URLSearchParams(params).toString()}`;
  // The deposit falls out of the date they searched, so this is their figure,
  // not a general claim. Inside three months there is no deposit to advertise.
  const total = result.packageTotal ?? room.total;
  const band = depositFor(params.depart ?? '');
  const payToday = band.percent < 100 ? depositAmount(total, band) : null;
  return (
    <article className="group relative grid overflow-hidden rounded-2xl border border-cloud-line bg-white shadow-[0_2px_8px_rgba(22,32,42,0.06)] transition-shadow hover:shadow-[0_6px_20px_rgba(22,32,42,0.12)] sm:grid-cols-[300px_1fr]">
      <div className="relative aspect-[4/3] bg-cloud sm:aspect-auto sm:min-h-[220px]">
        {result.image ? (
          <Image
            src={result.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 300px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-xl font-extrabold leading-snug tracking-[-0.01em] text-slate">
              {/* The whole card is the target; the stretched link keeps one
                  tab stop and one accessible name for it. */}
              <Link href={href} className="after:absolute after:inset-0 group-hover:text-flame">
                {result.name}
              </Link>
            </h3>
            {result.stars ? <Stars count={result.stars} /> : null}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-soft">{result.city}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{room.board}</Badge>
            {room.refundable ? <Badge tone="deal">Free cancellation</Badge> : null}
            {flight ? (
              <Badge>
                {flight.airlineName} ·{' '}
                {flight.outbound.stops === 0
                  ? 'Direct'
                  : `${flight.outbound.stops} stop${flight.outbound.stops > 1 ? 's' : ''}`}
              </Badge>
            ) : null}
            {/* No scarcity badge. The flight search returns the cheapest trip
                and the fares behind it, never a seat count, so there is no
                honest "only 3 left" to print. A refundable fare being on offer
                is a fact, and is worth more to a customer than a countdown. */}
            {flight?.refundableFrom ? <Badge tone="deal">Refundable fares available</Badge> : null}
          </div>

          <p className="mt-3 truncate text-sm text-slate-soft">{room.roomName}</p>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-3 border-t border-cloud-line pt-4 sm:min-w-[190px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
          <div>
            <p className="text-xs font-semibold text-slate-soft">
              {result.flightPending && !hotelOnlySearch ? 'Hotel only, from' : 'From'}
            </p>
            <p className="text-[34px] font-black leading-none tracking-[-0.03em] text-flame tabular-nums">
              {aed.format(result.perPerson)}
            </p>
            <p className="mt-1 text-xs font-bold text-slate">per person</p>
            <p className="mt-1 text-xs text-slate-soft">
              {aed.format(total)} total &middot; {result.nights} nights &middot; {travellers}{' '}
              travelling
            </p>
            {payToday !== null ? (
              <p className="mt-2 inline-block rounded-md bg-sun-wash px-2 py-1 text-xs font-bold text-slate">
                {aed.format(payToday)} to book &middot; {band.percent}% deposit
              </p>
            ) : null}
          </div>
          <div>
            <span className="inline-block rounded-full bg-flame px-6 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-flame-deep">
              View holiday
            </span>
            {result.flightPending && !hotelOnlySearch ? (
              <p className="mt-2 text-xs font-semibold text-slate-soft">Flights quoted separately</p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
