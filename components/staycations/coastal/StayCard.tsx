import Image from 'next/image';
import Link from 'next/link';
import Icon from './Icon';
import SaveHotelButton from '@/components/staycations/SaveHotelButton';
import type { StayCardModel } from '@/lib/staycations/stay-card';

/**
 * One hotel in the results list.
 *
 * The price line says what the money buys — nights and party — and nothing
 * about taxes, because the card's total comes from a cached cheapest rate
 * whose excluded charges we cannot restate here. The stay page has the offer
 * in full and discloses them there.
 */

function money(n: number) {
  return n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

export function InclusionChips({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i} className="flex items-center gap-1.5 text-[14px] leading-[20px] text-sea-soft">
          <Icon name={/breakfast|inclusive|board/i.test(i) ? 'breakfast' : 'umbrella'} size={16} className="text-petrol" />
          {i}
        </li>
      ))}
    </ul>
  );
}

export default function StayCard({
  stay,
  basis,
  priority = false,
}: {
  stay: StayCardModel;
  /** "2 nights · 2 adults" — what the total covers. */
  basis: string;
  priority?: boolean;
}) {
  return (
    <article className="cc-card">
      <Link href={stay.href} className="group block">
        <div className="relative aspect-[16/10] bg-mist">
          {stay.photo ? (
            <Image
              src={stay.photo}
              alt={stay.name}
              fill
              priority={priority}
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-petrol to-petrol-deep p-6">
              <p className="text-center font-display text-[22px] leading-[28px] text-white/90">{stay.name}</p>
            </div>
          )}
          {stay.featured && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-petrol">
              Specialist pick
            </span>
          )}
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={stay.href}>
              <h3 className="cc-h4 text-sea-ink hover:text-petrol">{stay.name}</h3>
            </Link>
            <p className="mt-1 flex items-center gap-1.5 text-[14px] leading-[20px] text-sea-soft">
              <Icon name="pin" size={16} className="text-petrol" />
              {[stay.emirate, stay.area].filter(Boolean).join(' · ')}
            </p>
          </div>
          <SaveHotelButton slug={stay.slug} name={stay.name} savedColor="#164B57" className="-mr-1 -mt-1 shrink-0 !bg-transparent !shadow-none" />
        </div>

        <InclusionChips items={stay.inclusions} />

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {stay.rate ? (
              <>
                <p className="cc-price">
                  {stay.rate.currency} {money(stay.rate.total)} <span className="text-[15px] font-normal text-sea-soft">total</span>
                </p>
                <p className="cc-support">{basis}</p>
              </>
            ) : stay.soldOut ? (
              <>
                <p className="text-[15px] font-medium text-sea-ink">No availability</p>
                <p className="cc-support">for these dates</p>
              </>
            ) : (
              <>
                <p className="text-[15px] font-medium text-sea-ink">{stay.bandLabel ?? 'Price on request'}</p>
                <p className="cc-support">{stay.bandLabel ? 'a night, indicative' : 'we price this by hand'}</p>
              </>
            )}
          </div>
          <Link href={stay.href} className="cc-btn-primary shrink-0 !min-h-[44px] !px-4 text-[15px]">
            View stay
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

/** The smaller card used in the Explore rail. */
export function CompactStayCard({ stay }: { stay: StayCardModel }) {
  return (
    <Link href={stay.href} className="cc-card flex min-w-0 items-stretch gap-0 hover:border-petrol">
      <div className="relative aspect-[4/3] w-[104px] shrink-0 bg-mist sm:w-[132px]">
        {stay.photo ? (
          <Image src={stay.photo} alt={stay.name} fill sizes="132px" className="object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-petrol to-petrol-deep" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[19px] font-medium leading-[25px] text-sea-ink">{stay.name}</h3>
          <p className="cc-support truncate">
            {[stay.emirate, stay.style].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-1 text-[15px] font-semibold tabular-nums text-sea-ink">
            {stay.rate ? (
              <>
                {stay.rate.currency} {money(stay.rate.total)}{' '}
                <span className="text-[13px] font-normal text-sea-soft">total</span>
              </>
            ) : (
              <span className="text-[14px] font-normal text-sea-soft">{stay.bandLabel ?? 'Price on request'}</span>
            )}
          </p>
        </div>
        <Icon name="chevron-right" size={18} className="shrink-0 text-sea-soft" />
      </div>
    </Link>
  );
}
