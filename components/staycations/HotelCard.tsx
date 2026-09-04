import Image from 'next/image';
import Link from 'next/link';
import SaveHotelButton from '@/components/staycations/SaveHotelButton';

/** Everything a card needs, already resolved on the server. */
export type HotelCardModel = {
  slug: string;
  name: string;
  emirate: string;
  area: string;
  stars: number | null;
  style: string;
  mealPlans: string[];
  /** e.g. "AED 700–1,500" — null when no band is set. */
  priceBandLabel: string | null;
  featured: boolean;
  /** A photo we can serve, or null for the branded panel. */
  photo: string | null;
};

function Stars({ n }: { n: number | null }) {
  if (!n) return null;
  return <span className="text-[13px] tracking-[0.1em] text-teal-deep">{'★'.repeat(n)}</span>;
}

/**
 * One hotel in the directory. Used by the hotels page (server) and the
 * saved-hotels list (client), so it must stay free of server-only imports.
 */
export default function HotelCard({
  hotel: h,
  base,
  dates = '',
  priority = false,
}: {
  hotel: HotelCardModel;
  base: string;
  /** Query string carrying the chosen weekend to the hotel page. */
  dates?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`${base}/hotels/${h.slug}${dates}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-xl hover:shadow-ink/10"
    >
      <div className="relative aspect-[16/10] bg-ink">
        {h.photo ? (
          <Image
            src={h.photo}
            alt={h.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-ink to-teal-deep/60 p-6">
            <p className="text-center font-serif text-2xl leading-snug text-white/90">{h.name}</p>
          </div>
        )}
        {h.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-teal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Specialist pick
          </span>
        )}
        <SaveHotelButton slug={h.slug} name={h.name} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl leading-snug text-ink group-hover:text-teal-deep">{h.name}</h3>
          <Stars n={h.stars} />
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-teal-deep">
          {[h.emirate, h.area].filter(Boolean).join(' · ')}
        </p>
        {h.style && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{h.style}</p>}
        {h.mealPlans.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {h.mealPlans.slice(0, 3).map((m) => (
              <span key={m} className="rounded-full bg-sand px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{m}</span>
            ))}
            {h.mealPlans.length > 3 && (
              <span className="rounded-full bg-sand px-2.5 py-1 text-[11px] font-semibold text-ink-soft">+{h.mealPlans.length - 3}</span>
            )}
          </div>
        )}
        {h.priceBandLabel && (
          <p className="mt-3 text-sm font-semibold text-ink">
            {h.priceBandLabel}
            <span className="font-normal text-ink-soft"> a night, roughly</span>
          </p>
        )}
        <p className="mt-auto pt-4 text-sm font-bold text-teal-deep">
          Ask about this hotel <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </p>
      </div>
    </Link>
  );
}
