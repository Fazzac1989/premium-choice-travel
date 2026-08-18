import Image from 'next/image';
import Link from 'next/link';
import type { Package } from '@/lib/types';
import { durationLabel, formatPrice } from '@/lib/types';
import StatusBadge from '@/components/admin/StatusBadge';

const IMAGE_TARGET = 7;

function imageCount(p: Package) {
  return (p.heroImage ? 1 : 0) + p.gallery.length;
}

/** Status filter chips for the admin journey lists. */
export function StatusFilters({ base, active }: { base: string; active: string }) {
  const sep = base.includes('?') ? '&' : '?';
  const chips = [
    ['', 'All'],
    ['draft', 'Draft'],
    ['review', 'Ready for review'],
    ['published', 'Published'],
    ['featured', 'Featured'],
  ];
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {chips.map(([value, label]) => (
        <Link
          key={label}
          href={value ? `${base}${sep}status=${value}` : base}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            active === value ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export function filterByStatus(packages: Package[], status: string) {
  if (!status) return packages;
  if (status === 'featured') return packages.filter((p) => p.featured);
  return packages.filter((p) => p.status === status);
}

/** The admin journeys list rows — shared by the group list and brand workspaces. */
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
          No journeys here yet — create one or use the AI importer.
        </p>
      )}
      {packages.map((p) => {
        const imgs = imageCount(p);
        const imgsOk = imgs >= IMAGE_TARGET;
        return (
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
              {p.reviewNote && (
                <p className="mt-0.5 truncate text-[11px] italic text-[#8A6D1A]">⚠ {p.reviewNote}</p>
              )}
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              {p.priceFrom !== null && p.priceStatus === 'approved' ? (
                <p className="text-sm font-semibold text-ink">from {formatPrice(p.currency, p.priceFrom)}</p>
              ) : (
                <p className="text-xs text-ink-soft">Price on request</p>
              )}
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    imgsOk ? 'bg-teal/15 text-teal-deep' : 'bg-danger/10 text-danger'
                  }`}
                  title={imgsOk ? 'Imagery complete' : 'Needs more imagery'}
                >
                  {imgs}/{IMAGE_TARGET} img
                </span>
                {p.featured && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase text-white">Featured</span>}
                <StatusBadge status={p.status} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
