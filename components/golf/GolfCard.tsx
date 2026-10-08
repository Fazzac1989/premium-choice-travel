import Image from 'next/image';
import Link from 'next/link';
import type { Package } from '@/lib/types';
import { formatPrice } from '@/lib/types';
import { GOLF_BOARDS, approvedPrice, golfFacts } from '@/lib/golf/catalogue';

/**
 * The golf deal card, in the anatomy golf catalogues use: kind of trip,
 * name, where, what is in it, the package in one line, then the price.
 *
 * Every word comes from the trip itself. The ticks are the trip's own
 * inclusions (flights and our own support are left out — they are not
 * perks); there are no review stars or "free" badges until there are real
 * reviews and contracted offers; a price shows only once approved.
 */
export default function GolfCard({
  pkg,
  href,
  priority = false,
  layout = 'grid',
}: {
  pkg: Package;
  href: string;
  priority?: boolean;
  layout?: 'grid' | 'row';
}) {
  const f = golfFacts(pkg);
  const price = approvedPrice(pkg);
  const perks = (pkg.includes ?? [])
    .filter((i) => !/flight|consultant|support|PCT/i.test(i))
    .slice(0, 3);
  const board = f.boards[0] ? GOLF_BOARDS.find((b) => b.key === f.boards[0])!.label.toLowerCase() : f.board?.toLowerCase();
  const summary = [
    `${pkg.nights} night${pkg.nights === 1 ? '' : 's'}${f.rounds ? ` & ${f.rounds} round${f.rounds === 1 ? '' : 's'}` : ''}`,
    board,
  ].filter(Boolean).join(', ');

  const image = (
    <div className={`relative overflow-hidden bg-golf-mist ${layout === 'row' ? 'aspect-[16/10] sm:aspect-auto sm:w-[300px] sm:shrink-0' : 'aspect-[16/10]'}`}>
      {pkg.heroImage ? (
        <Image
          src={pkg.heroImage}
          alt={pkg.title}
          fill
          priority={priority}
          sizes={layout === 'row' ? '(max-width: 640px) 100vw, 300px' : '(max-width: 768px) 100vw, 25vw'}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-fairway to-golf-navy" />
      )}
    </div>
  );

  const body = (
    <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">{f.tripTypeLabel}</p>
      <h3 className="mt-1 text-lg font-extrabold leading-snug text-golf-navy group-hover:text-fairway">{pkg.title}</h3>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        {f.country}
        {layout === 'row' && <span className="font-semibold normal-case tracking-normal"> · {f.region}</span>}
      </p>
      {layout === 'row' && f.stay && <p className="mt-2 text-sm text-ink-soft">{f.stay}</p>}
      {perks.length > 0 && (
        <ul className="mt-3 space-y-1">
          {perks.map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-[13px] font-semibold leading-snug text-fairway">
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" className="mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5 9-10" /></svg>
              <span className="line-clamp-1">{p}</span>
            </li>
          ))}
        </ul>
      )}
      {layout === 'grid' && <p className="mt-3 text-sm text-golf-navy">{summary}</p>}
      {layout === 'grid' && <Price price={price} pkg={pkg} flights={f.flights} />}
    </div>
  );

  if (layout === 'row') {
    return (
      <Link href={href} className="group card flex flex-col transition-shadow hover:shadow-lg sm:flex-row">
        {image}
        {body}
        <div className="flex flex-col justify-between gap-4 border-t border-golf-line p-4 sm:w-56 sm:shrink-0 sm:border-l sm:border-t-0 sm:p-5">
          <p className="text-sm font-semibold text-golf-navy">{summary}</p>
          <div>
            <Price price={price} pkg={pkg} flights={f.flights} />
            <span className="btn-primary mt-3 w-full !py-2.5 text-sm">View trip</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group card flex flex-col transition-shadow hover:shadow-lg">
      {image}
      {body}
    </Link>
  );
}

function Price({ price, pkg, flights }: { price: number | null; pkg: Package; flights: string }) {
  return (
    <div className="mt-auto pt-3">
      {price !== null ? (
        <>
          <p className="text-[11px] text-ink-soft">from</p>
          <p className="text-3xl font-extrabold leading-none text-golf-navy">
            {formatPrice(pkg.currency, price)}
            <span className="ml-0.5 text-sm font-bold">pp</span>
          </p>
        </>
      ) : (
        <>
          <p className="text-xl font-extrabold leading-tight text-golf-navy">Price on request</p>
          <p className="text-[11px] text-ink-soft">Costed for your dates and rooms</p>
        </>
      )}
      <p className="mt-1 text-[11px] font-semibold text-fairway">Flights: {flights.toLowerCase()}</p>
    </div>
  );
}
