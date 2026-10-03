import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/staycations/coastal/Icon';
import { cancellationLabel, moneyLabel, type PublicRate } from '@/lib/staycations/stay-search';

/**
 * One stay in the results, as the trade portal's row card lays it out (founder, 2026-10-03):
 * photo on the left, then name, stars and area, the room · dates · board chips, and the total
 * with its button at the foot. A stay we have not priced shows its guide band instead.
 */
export type ResultRowModel = {
  key: string;
  href: string;
  name: string;
  area: string;
  stars: number | null;
  image: string | null;
  specialistPick: boolean;
  rate: PublicRate | null;
  /** e.g. "15 Nov – 16 Nov · 1 night" when a rate is shown */
  dates: string | null;
  /** the guide band, when there is no rate */
  guide: string | null;
  /** extra rooms at this hotel beyond the one shown */
  moreRooms: number;
};

export default function ResultRow({ m, priority = false }: { m: ResultRowModel; priority?: boolean }) {
  return (
    <article className="cc-card flex flex-col md:flex-row">
      <Link href={m.href} className="relative block aspect-[4/3] shrink-0 bg-petrol md:aspect-auto md:min-h-[220px] md:w-[288px]" tabIndex={-1} aria-hidden="true">
        {m.image ? (
          <Image src={m.image} alt="" fill sizes="(min-width: 768px) 288px, 100vw" className="object-cover" priority={priority} />
        ) : (
          <span className="absolute inset-0 flex items-end bg-gradient-to-br from-petrol to-petrol-deep p-4 font-display text-[22px] leading-[26px] text-white">
            {m.name}
          </span>
        )}
        {m.specialistPick && (
          <span className="absolute start-3 top-3 rounded-full bg-white/95 px-3 py-1 text-[12px] font-semibold text-petrol">
            Specialist pick
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-4 md:p-5">
        <h3 className="cc-h4 text-[19px] leading-[25px]">
          <Link href={m.href} className="hover:underline">
            {m.name}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-sea-soft">
          {m.stars ? (
            <span aria-label={`${m.stars} star hotel`} className="text-petrol">
              {'★'.repeat(m.stars)}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Icon name="pin" size={15} />
            {m.area}
          </span>
        </p>

        {m.rate && (
          <ul className="mt-3 flex flex-wrap gap-2 text-[13px] text-sea-ink">
            <li className="rounded-[8px] border border-sea-line px-2.5 py-1">{m.rate.roomName}</li>
            {m.dates && <li className="rounded-[8px] border border-sea-line px-2.5 py-1">{m.dates}</li>}
            <li className="rounded-[8px] border border-sea-line px-2.5 py-1">{m.rate.board}</li>
          </ul>
        )}
        {m.rate && (
          <p className={`mt-2 text-[14px] font-medium ${m.rate.refundable ? 'text-ok-ink' : 'text-sea-soft'}`}>
            {cancellationLabel(m.rate)}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-sea-line pt-3 md:mt-4">
          <div>
            {m.rate ? (
              <>
                <p className="font-display text-[28px] font-semibold leading-[32px] text-sea-ink">
                  {moneyLabel(m.rate.total, m.rate.currency)}
                </p>
                <p className="cc-support">
                  total, taxes in · {moneyLabel(m.rate.perNight, m.rate.currency)} a night
                  {m.moreRooms > 0 ? ` · ${m.moreRooms} more room${m.moreRooms === 1 ? '' : 's'}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="cc-price">{m.guide ?? 'Price on request'}</p>
                <p className="cc-support">a night, indicative</p>
              </>
            )}
          </div>
          <Link href={m.href} className="cc-btn-primary !min-h-[44px] !rounded-full !px-6">
            {m.rate ? 'View rooms' : 'View stay'}
            <Icon name="chevron-right" size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
