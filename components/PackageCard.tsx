import Image from 'next/image';
import Link from 'next/link';
import type { Package } from '@/lib/types';
import { durationLabel, formatPrice } from '@/lib/types';
import { brandLabel, brandSiteUrl } from '@/lib/brands';

export default function PackageCard({
  pkg,
  priority = false,
  hrefBase = '/journeys',
  /** Master site: open the journey on the brand's own website, in a new tab. */
  external = false,
}: {
  pkg: Package;
  priority?: boolean;
  hrefBase?: string;
  external?: boolean;
}) {
  const site = external ? brandSiteUrl(pkg.brand) : null;
  const cls = 'group card flex flex-col transition-shadow hover:shadow-xl hover:shadow-ink/10';
  const inner = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={pkg.heroImage}
          alt={pkg.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink backdrop-blur">
          {pkg.category}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow">
          {pkg.destinationName}
          <span className="font-normal normal-case tracking-normal text-ink-soft/70"> · Premium Choice {brandLabel(pkg.brand)}</span>
        </p>
        <h3 className="mt-1.5 font-serif text-xl leading-snug text-ink group-hover:text-teal-deep">
          {pkg.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{pkg.tagline}</p>
        <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
          <span className="text-xs text-ink-soft">{durationLabel(pkg)}</span>
          {pkg.priceFrom !== null && (pkg.priceStatus === undefined || pkg.priceStatus === 'approved') ? (
            <span className="text-sm text-ink-soft">
              from <span className="text-lg font-semibold text-ink">{formatPrice(pkg.currency, pkg.priceFrom)}</span>
              <span className="text-xs"> pp</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-teal-deep">Price on request</span>
          )}
        </div>
      </div>
    </>
  );

  // A journey belongs to a brand: on the master site the card opens that
  // brand's own website; inside a brand site it stays put.
  return site ? (
    <a href={`${site}/journeys/${pkg.slug}`} target="_blank" rel="noopener" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={`${hrefBase}/${pkg.slug}`} className={cls}>
      {inner}
    </Link>
  );
}
