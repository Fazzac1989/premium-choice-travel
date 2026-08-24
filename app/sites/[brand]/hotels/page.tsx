import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import type { Hotel } from '@/lib/types';
import { isPlacesConfigured, placePhotoSrc } from '@/lib/images/google-places';
import { DRIVE_BANDS, driveLabel, findWeekend, weekendOptions } from '@/lib/weekend';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'UAE hotels',
  description:
    'The UAE hotels our specialists actually book — filter by drive time from Dubai, star rating, emirate and meal plan, then ask us for a personalised staycation quote.',
};

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Ajman', 'Umm Al Quwain'];
const MEAL_PLANS = ['Room only', 'Bed & breakfast', 'Half board', 'Full board', 'All-inclusive'];

function Stars({ n }: { n: number | null | undefined }) {
  if (!n) return null;
  return <span className="text-[13px] tracking-[0.1em] text-teal-deep">{'★'.repeat(n)}</span>;
}

function HotelCard({ h, base, dates }: { h: Hotel; base: string; dates: string }) {
  const photo = isPlacesConfigured() && h.photos?.[0] ? placePhotoSrc(h.photos[0].name, 800) : h.image || h.gallery[0];
  const drive = driveLabel(h.driveMinutes);
  return (
    <Link
      href={`${base}/hotels/${hotelSlug(h.name)}${dates}`}
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
        {drive && (
          <span className="absolute bottom-3 right-3 rounded-full bg-ink/75 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            {drive} from Dubai
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

type Filters = { when?: string; drive?: string; emirate?: string; stars?: string; meal?: string };

export default async function StaycationHotelsPage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: Filters;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const all = await getStaycationHotels();
  const current: Filters = {
    when: searchParams.when ?? '',
    drive: searchParams.drive ?? '',
    emirate: searchParams.emirate ?? '',
    stars: searchParams.stars ?? '',
    meal: searchParams.meal ?? '',
  };

  const weekend = findWeekend(current.when || undefined);
  const driveMax = current.drive ? Number(current.drive) : 0;
  // Drive times only exist once migration 011 has run; until then the band
  // filter has nothing to work with, so it stays hidden rather than empty.
  const haveDriveTimes = all.some((h) => h.driveMinutes);

  const filtered = all.filter(
    (h) =>
      (!current.emirate || h.emirate === current.emirate) &&
      (!current.stars || String(h.stars ?? '') === current.stars) &&
      (!current.meal || h.mealPlans.some((m: string) => m.toLowerCase() === current.meal!.toLowerCase())) &&
      (!driveMax || (h.driveMinutes ?? Infinity) <= driveMax)
  );

  // Nearest first when someone has said how far they will drive.
  const ordered = driveMax
    ? [...filtered].sort((a, b) => (a.driveMinutes ?? 9999) - (b.driveMinutes ?? 9999))
    : filtered;

  /** Build a URL with one filter changed and the rest kept. */
  const href = (patch: Filters) => {
    const next = { ...current, ...patch };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const qs = q.toString();
    return qs ? `${base}/hotels?${qs}` : `${base}/hotels`;
  };

  // Chosen dates travel to the hotel page and land in the availability form.
  const dateQuery = weekend ? `?from=${weekend.checkIn}&nights=${weekend.nights}` : '';

  const emirates = EMIRATES.filter((e) => all.some((h) => h.emirate === e));
  const starOptions = ['5', '4', '3'].filter((s) => all.some((h) => String(h.stars ?? '') === s));
  const mealOptions = MEAL_PLANS.filter((m) => all.some((h) => h.mealPlans.some((x: string) => x.toLowerCase() === m.toLowerCase())));
  const driveBands = DRIVE_BANDS.filter((b) => all.some((h) => (h.driveMinutes ?? 0) > 0 && h.driveMinutes! <= b.max));

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
            Where to this weekend?
          </h1>
          <p className="mt-4 max-w-xl text-ink-soft">
            {all.length} hotels across the seven emirates, all of them ones we would put a
            family in. Say when you’re thinking and how far you’ll drive — we do the rest.
          </p>

          {/* When — the way the decision actually starts */}
          <div className="mt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">When</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {weekendOptions().map((o) => {
                const active = current.when === o.key;
                return (
                  <Link
                    key={o.key}
                    href={href({ when: active ? '' : o.key })}
                    className={`rounded-2xl px-4 py-2.5 text-left transition-colors ${
                      active ? 'bg-ink text-white' : 'bg-white text-ink hover:text-teal-deep'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{o.label}</span>
                    <span className={`block text-[11px] ${active ? 'text-white/70' : 'text-ink-soft'}`}>{o.dates}</span>
                  </Link>
                );
              })}
              <Link
                href={href({ when: '' })}
                className={`self-start ${chip(!current.when)}`}
              >
                I’m flexible
              </Link>
            </div>
            {weekend && (
              <p className="mt-2.5 text-xs text-ink-soft">
                {weekend.dates} · {weekend.nights} night{weekend.nights === 1 ? '' : 's'} — carried
                through to your enquiry so you don’t type it twice.
              </p>
            )}
          </div>

          {/* How far you'll drive */}
          {haveDriveTimes && (
            <div className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">How far from Dubai</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Link href={href({ drive: '' })} className={chip(!current.drive)}>Any distance</Link>
                {driveBands.map((b) => (
                  <Link key={b.key} href={href({ drive: b.key })} className={chip(current.drive === b.key)}>
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-line pt-5">
            {/* Emirate */}
            <div className="flex flex-wrap gap-2">
              <Link href={href({ emirate: '' })} className={smallChip(!current.emirate)}>All emirates</Link>
              {emirates.map((e) => (
                <Link key={e} href={href({ emirate: e })} className={smallChip(current.emirate === e)}>{e}</Link>
              ))}
            </div>
            {/* Stars */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={href({ stars: '' })} className={smallChip(!current.stars)}>Any rating</Link>
              {starOptions.map((s) => (
                <Link key={s} href={href({ stars: s })} className={smallChip(current.stars === s)}>{s}★</Link>
              ))}
            </div>
            {/* Meal plan */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={href({ meal: '' })} className={smallChip(!current.meal)}>Any meal plan</Link>
              {mealOptions.map((m) => (
                <Link key={m} href={href({ meal: m })} className={smallChip(current.meal?.toLowerCase() === m.toLowerCase())}>{m}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-14">
        <div className="container-site">
          {ordered.length === 0 ? (
            <div className="rounded-2xl border border-line p-12 text-center">
              <p className="font-serif text-2xl text-ink">Nothing matches that combination — yet.</p>
              <p className="mt-3 text-ink-soft">Tell us what you have in mind and we’ll find it.</p>
              <Link href={`${base}/enquire`} className="btn-primary mt-6">Plan my staycation</Link>
            </div>
          ) : (
            <>
              <p className="text-xs text-ink-soft">
                {ordered.length} hotel{ordered.length === 1 ? '' : 's'}
                {driveMax ? ` within ${driveLabel(driveMax)} of Dubai, nearest first` : ''}
              </p>
              <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {ordered.map((h) => (
                  <HotelCard key={h.id} h={h} base={base} dates={dateQuery} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
