import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import type { Hotel } from '@/lib/types';
import { isPlacesConfigured, placePhotoSrc } from '@/lib/images/google-places';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'UAE hotels',
  description:
    'The UAE hotels our specialists actually book — filter by star rating, emirate and meal plan, then ask us for a personalised staycation quote.',
};

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Ajman', 'Umm Al Quwain'];
const MEAL_PLANS = ['Room only', 'Bed & breakfast', 'Half board', 'Full board', 'All-inclusive'];

function Stars({ n }: { n: number | null | undefined }) {
  if (!n) return null;
  return <span className="text-[13px] tracking-[0.1em] text-teal-deep">{'★'.repeat(n)}</span>;
}

function HotelCard({ h, base }: { h: Hotel; base: string }) {
  const photo = isPlacesConfigured() && h.photos?.[0] ? placePhotoSrc(h.photos[0].name, 800) : h.image || h.gallery[0];
  return (
    <Link
      href={`${base}/hotels/${hotelSlug(h.name)}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-xl hover:shadow-ink/10"
    >
      <div className="relative aspect-[16/10] bg-ink">
        {photo ? (
          <Image
            src={photo}
            alt={h.name}
            fill
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
        <p className="mt-auto pt-4 text-sm font-bold text-teal-deep">
          Ask about this hotel <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </p>
      </div>
    </Link>
  );
}

export default async function StaycationHotelsPage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: { emirate?: string; stars?: string; meal?: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const all = await getStaycationHotels();
  const emirate = searchParams.emirate ?? '';
  const stars = searchParams.stars ?? '';
  const meal = searchParams.meal ?? '';

  const filtered = all.filter(
    (h) =>
      (!emirate || h.emirate === emirate) &&
      (!stars || String(h.stars ?? '') === stars) &&
      (!meal || h.mealPlans.some((m: string) => m.toLowerCase() === meal.toLowerCase()))
  );

  const href = (e: string, s: string, m: string) => {
    const q = new URLSearchParams();
    if (e) q.set('emirate', e);
    if (s) q.set('stars', s);
    if (m) q.set('meal', m);
    const qs = q.toString();
    return qs ? `${base}/hotels?${qs}` : `${base}/hotels`;
  };

  const emirates = EMIRATES.filter((e) => all.some((h) => h.emirate === e));
  const starOptions = ['5', '4', '3'].filter((s) => all.some((h) => String(h.stars ?? '') === s));
  const mealOptions = MEAL_PLANS.filter((m) => all.some((h) => h.mealPlans.some((x: string) => x.toLowerCase() === m.toLowerCase())));

  const chip = (active: boolean, extra = '') =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-ink text-white' : 'bg-white text-ink-soft hover:text-ink'} ${extra}`;
  const smallChip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-teal text-white' : 'bg-white text-ink-soft hover:text-ink'}`;

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-12 sm:py-14">
          <p className="eyebrow">{brand.name}</p>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
            The UAE’s hotels, hand-picked
          </h1>
          <p className="mt-4 max-w-xl text-ink-soft">
            {all.length} properties across the seven emirates. Filter to what you’re after,
            then tell us your dates — we chase the extras and price it personally.
          </p>

          {/* Emirate */}
          <div className="mt-8 flex flex-wrap gap-2">
            <Link href={href('', stars, meal)} className={chip(!emirate)}>All emirates</Link>
            {emirates.map((e) => (
              <Link key={e} href={href(e, stars, meal)} className={chip(emirate === e)}>{e}</Link>
            ))}
          </div>
          {/* Stars */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={href(emirate, '', meal)} className={smallChip(!stars)}>Any rating</Link>
            {starOptions.map((s) => (
              <Link key={s} href={href(emirate, s, meal)} className={smallChip(stars === s)}>{s}★</Link>
            ))}
          </div>
          {/* Meal plan */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={href(emirate, stars, '')} className={smallChip(!meal)}>Any meal plan</Link>
            {mealOptions.map((m) => (
              <Link key={m} href={href(emirate, stars, m)} className={smallChip(meal.toLowerCase() === m.toLowerCase())}>{m}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-14">
        <div className="container-site">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-line p-12 text-center">
              <p className="font-serif text-2xl text-ink">Nothing matches that combination — yet.</p>
              <p className="mt-3 text-ink-soft">Tell us what you have in mind and we’ll find it.</p>
              <Link href={`${base}/enquire`} className="btn-primary mt-6">Plan my staycation</Link>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-soft">{filtered.length} hotel{filtered.length === 1 ? '' : 's'}</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((h) => (
                  <HotelCard key={h.id} h={h} base={base} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
