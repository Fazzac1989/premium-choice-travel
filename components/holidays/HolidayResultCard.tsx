import Image from 'next/image';
import Link from 'next/link';
import type { HolidayResult } from '@/lib/holidays/holiday-search';

/**
 * One holiday in the list.
 *
 * The price a UAE family compares on is the per-person price, so that is the
 * big number. What it does and does not include is stated next to it rather
 * than in a footnote: while flights are not yet live, a price that looks like a
 * package but is really a hotel would be the single most misleading thing on
 * the site.
 */

const aed = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
});

function Stars({ count }: { count: number }) {
  return (
    <span className="text-teal-deep" aria-label={`${count} star`}>
      {'★'.repeat(count)}
    </span>
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
  const href = `/search/${result.platformHotelId}?${new URLSearchParams(params).toString()}`;
  return (
    <article className="group relative grid overflow-hidden rounded-2xl border border-line bg-white transition-colors focus-within:border-teal-deep hover:border-teal-deep sm:grid-cols-[260px_1fr]">
      <div className="relative aspect-[4/3] bg-sand sm:aspect-auto sm:min-h-[200px]">
        {result.image ? (
          <Image
            src={result.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 260px"
            className="object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="font-serif text-xl leading-snug text-ink">
              {/* The whole card is the target; the stretched link keeps one
                  tab stop and one accessible name for it. */}
              <Link href={href} className="after:absolute after:inset-0 group-hover:text-teal-deep">
                {result.name}
              </Link>
            </h3>
            {result.stars ? <Stars count={result.stars} /> : null}
          </div>
          <p className="mt-1 text-sm text-ink-soft">{result.city}</p>

          <dl className="mt-3 grid gap-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-ink-soft">Room</dt>
              <dd className="min-w-0 text-ink">{room.roomName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-soft">Board</dt>
              <dd className="text-ink">{room.board}</dd>
            </div>
            {flight ? (
              <div className="flex gap-2">
                <dt className="text-ink-soft">Flight</dt>
                <dd className="text-ink">
                  {flight.outbound.carrierName} · {flight.outbound.stops === 0 ? 'direct' : `${flight.outbound.stops} stop`}
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-3 text-xs text-ink-soft">
            {room.refundable ? 'Free cancellation available' : 'Non-refundable rate'}
          </p>
        </div>

        <div className="flex shrink-0 flex-col justify-between gap-3 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
          <div>
            <p className="text-xs text-ink-soft">
              {result.flightPending ? 'Hotel only, per person' : 'Per person, flight and hotel'}
            </p>
            <p className="font-serif text-3xl text-ink">{aed.format(result.perPerson)}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {result.nights} nights · {travellers} travelling
            </p>
            {result.flightPending ? (
              <p className="mt-1.5 text-xs font-semibold text-teal-deep">Flights quoted separately</p>
            ) : null}
          </div>
          <p className="text-xs text-ink-soft">
            {aed.format(result.packageTotal ?? room.total)} total
          </p>
        </div>
      </div>
    </article>
  );
}
