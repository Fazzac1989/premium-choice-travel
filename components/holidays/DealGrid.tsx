import Image from 'next/image';
import Link from 'next/link';
import { holidayDeals, type Deal } from '@/lib/holidays/deals';
import { holidayQuery } from '@/lib/holidays/search-criteria';

/**
 * What a real week actually costs, right now.
 *
 * Every figure here came from a live supplier search rather than a brochure,
 * which is the only reason the grid can carry dates at all. It is a teaser:
 * the price is indicative, and the card links into a fresh search for the
 * customer's own dates, where the price is live and bookable.
 *
 * Nothing is invented when there is nothing to show. A route the platform
 * cannot answer for drops out, and if none answer the section does not render
 * — the search above it is the real way in, and an empty grid of placeholder
 * cards would be worse than no grid.
 */

const aed = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
});

export function DealGridSkeleton() {
  return (
    <section className="bg-haze py-12">
      <div className="container-site">
        <div className="h-7 w-72 animate-pulse rounded bg-haze-line" />
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-72 animate-pulse rounded-2xl border border-haze-line bg-white/70" />
          ))}
        </ul>
      </div>
    </section>
  );
}

function Card({ deal, base }: { deal: Deal; base: string }) {
  const href = `${base}/search?${holidayQuery({
    mode: 'package',
    origin: 'DXB',
    destination: deal.query.to,
    departDate: deal.query.depart,
    nights: deal.query.nights,
    adults: 2,
  })}`;
  return (
    <li>
      <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-haze-line bg-white transition-shadow hover:shadow-[0_8px_24px_rgba(30,0,35,0.12)]">
        <div className="relative aspect-[4/3] bg-haze">
          {deal.image ? (
            <Image src={deal.image} alt="" fill sizes="(max-width: 640px) 100vw, 300px" className="object-cover" />
          ) : null}
          <span className="absolute left-3 top-3 rounded-md bg-aubergine/85 px-2 py-1 text-xs font-bold text-white backdrop-blur">
            {deal.when}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-aubergine-soft">{deal.where}</p>
          <h3 className="text-[15px] font-extrabold leading-snug text-aubergine">
            <Link href={href} className="after:absolute after:inset-0 group-hover:text-magenta">
              {deal.hotel}
            </Link>
          </h3>
          <p className="text-xs text-aubergine-soft">
            {deal.stars ? `${deal.stars}-star · ` : ''}
            {deal.board}
          </p>

          <div className="mt-auto pt-3">
            <p className="text-xs text-aubergine-soft">Hotel only, from</p>
            <p className="text-2xl font-black leading-none tracking-[-0.02em] text-magenta tabular-nums">
              {aed.format(deal.perPerson)}
            </p>
            <p className="mt-0.5 text-xs text-aubergine-soft">
              per person &middot; {aed.format(deal.total)} total
            </p>
          </div>
        </div>
      </article>
    </li>
  );
}

export default async function DealGrid({ base }: { base: string }) {
  const { deals } = await holidayDeals();
  if (!deals.length) return null;

  return (
    <section className="bg-haze py-12">
      <div className="container-site">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-aubergine sm:text-3xl">
              What a week actually costs
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-aubergine-soft">
              Priced by our suppliers in the last few hours, for two sharing, flying from Dubai.
              Open one and we will search your own dates.
            </p>
          </div>
          <Link
            href={`${base}/holidays`}
            className="text-sm font-bold text-magenta underline-offset-4 hover:underline"
          >
            All holidays &rarr;
          </Link>
        </div>

        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {deals.slice(0, 8).map((d) => (
            <Card key={`${d.where}-${d.hotelId}`} deal={d} base={base} />
          ))}
        </ul>

        <p className="mt-4 text-xs text-aubergine-soft">
          Indicative prices for the dates shown, hotel only. Flights are quoted alongside by a
          specialist. What you pay is confirmed when you search your own dates.
        </p>
      </div>
    </section>
  );
}
