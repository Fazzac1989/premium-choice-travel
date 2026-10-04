import Image from 'next/image';
import Link from 'next/link';
import type { Package } from '@/lib/types';
import { formatPrice } from '@/lib/types';
import { approvedPrice, golfFacts } from '@/lib/golf/catalogue';

/**
 * The one golf card. Every card carries the same facts in the same places:
 * where you stay, nights, rounds, board, flights and the AED price basis.
 * A price shows only once it has been approved in the admin; until then the
 * card says so rather than inventing one.
 */
export default function GolfCard({ pkg, href, priority = false }: { pkg: Package; href: string; priority?: boolean }) {
  const f = golfFacts(pkg);
  const price = approvedPrice(pkg);
  const facts: [string, string | null][] = [
    ['Nights', `${pkg.nights} night${pkg.nights === 1 ? '' : 's'}`],
    ['Golf', f.roundsLabel],
    ['Board', f.board],
    ['Flights', f.flights],
  ];

  return (
    <Link href={href} className="group card flex flex-col transition-shadow hover:shadow-xl hover:shadow-ink/10">
      <div className="relative aspect-[16/10] overflow-hidden">
        {pkg.heroImage ? (
          <Image
            src={pkg.heroImage}
            alt={pkg.title}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          // A trip with no photograph yet gets a plain panel, never a broken image.
          <div className="absolute inset-0 bg-gradient-to-br from-teal-deep to-ink" />
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink backdrop-blur">
          {f.tripTypeLabel}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">{f.country}</p>
        <h3 className="mt-1.5 font-serif text-xl leading-snug text-ink group-hover:text-teal-deep">{pkg.title}</h3>
        {f.stay && <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink-soft">{f.stay}</p>}
        <dl className="mb-4 mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/80">{label}</dt>
              <dd className="truncate text-ink" title={value ?? undefined}>{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-4">
          {price !== null ? (
            <span className="text-sm text-ink-soft">
              from <span className="text-lg font-semibold text-ink">{formatPrice(pkg.currency, price)}</span>
              <span className="text-xs"> pp</span>
            </span>
          ) : (
            <span className="text-sm font-semibold text-teal-deep">Price on request</span>
          )}
          <span className="text-xs font-semibold text-teal-deep group-hover:underline">View trip →</span>
        </div>
      </div>
    </Link>
  );
}
