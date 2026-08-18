import Image from 'next/image';
import Link from 'next/link';
import { listStTrips, PCST_SITE_URL } from '@/lib/pcst';
import StatusBadge from '@/components/admin/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function SchoolTripsPage() {
  const trips = await listStTrips();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Premium Choice School Trips</p>
          <h1 className="font-serif text-3xl text-ink">Trips</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {trips.length} trip{trips.length === 1 ? '' : 's'} · edits publish straight to {PCST_SITE_URL.replace('https://', '')}.
          </p>
        </div>
        <Link href="/admin/school-trips/trips/new" className="btn-primary">New trip</Link>
      </div>

      <div className="card mt-8 divide-y divide-line">
        {trips.length === 0 && <p className="p-10 text-center text-sm text-ink-soft">No trips yet.</p>}
        {trips.map((t) => (
          <Link key={t.id} href={`/admin/school-trips/trips/${t.id}`} className="flex items-center gap-5 p-4 transition-colors hover:bg-sand">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-sand">
              {t.heroImage && <Image src={t.heroImage} alt="" fill sizes="96px" className="object-cover" unoptimized />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{t.title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                <span className="font-semibold text-teal-deep">{t.subjectName || '—'}</span> · {t.countryName || '—'}
                {t.city ? ` · ${t.city}` : ''} · {t.durationDays} days / {t.durationNights} nights
              </p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <div className="flex items-center justify-end gap-1.5">
                {t.featured && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase text-white">Featured</span>}
                <StatusBadge status={t.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
