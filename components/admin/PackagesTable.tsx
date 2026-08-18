import Image from 'next/image';
import Link from 'next/link';
import type { Package } from '@/lib/types';
import { durationLabel, formatPrice } from '@/lib/types';
import StatusBadge from '@/components/admin/StatusBadge';

/** The admin packages list rows — shared by the group list and brand workspaces. */
export default function PackagesTable({
  packages,
  showBrand = true,
}: {
  packages: Package[];
  showBrand?: boolean;
}) {
  return (
    <div className="card divide-y divide-line">
      {packages.length === 0 && (
        <p className="p-10 text-center text-sm text-ink-soft">
          No packages here yet — create one or use the AI importer.
        </p>
      )}
      {packages.map((p) => (
        <Link key={p.id} href={`/admin/packages/${p.id}`} className="flex items-center gap-5 p-4 transition-colors hover:bg-sand">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-sand">
            {p.heroImage && <Image src={p.heroImage} alt="" fill sizes="96px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{p.title}</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {showBrand && <span className="font-semibold text-teal-deep">{p.brand} · </span>}
              {p.destinationName || '—'} · {p.category || '—'} · {durationLabel(p)}
            </p>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            {p.priceFrom !== null && (
              <p className="text-sm font-semibold text-ink">from {formatPrice(p.currency, p.priceFrom)}</p>
            )}
            <div className="mt-1 flex items-center justify-end gap-1.5">
              {p.featured && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase text-white">Featured</span>}
              <StatusBadge status={p.status} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
