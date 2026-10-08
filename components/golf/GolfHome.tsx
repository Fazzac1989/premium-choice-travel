import Image from 'next/image';
import Link from 'next/link';
import type { Brand } from '@/lib/brands';
import type { Package, Seasonality } from '@/lib/types';
import type { Offer } from '@/lib/offers-shared';
import GolfCard from '@/components/golf/GolfCard';
import GolfBrowseTabs, { type BrowseTab } from '@/components/golf/GolfBrowseTabs';
import OfferCard from '@/components/OfferCard';
import {
  GOLF_LENGTHS,
  GOLF_TRIP_TYPES,
  filterGolf,
  golfFacts,
  golfGeography,
  parseGolfCriteria,
  suitsGroups,
  type GolfTripTypeKey,
} from '@/lib/golf/catalogue';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The golf front page, laid out the way golf catalogues are: a search band,
 * photo tiles for the main ways in, deal cards, golf by month and a full
 * index. Everything is built from the trips we have — tile counts, photos,
 * month counts — so nothing points at an empty page.
 */
export default function GolfHome({
  brand,
  base,
  packages,
  offers,
  seasonality,
}: {
  brand: Brand;
  base: string;
  packages: Package[];
  offers: Offer[];
  seasonality: Record<string, Seasonality | undefined>;
}) {
  const journeys = `${base}/journeys`;
  const geography = golfGeography(packages);
  const facts = new Map(packages.map((p) => [p.slug, golfFacts(p)]));
  const ofType = (t: GolfTripTypeKey) => packages.filter((p) => facts.get(p.slug)!.tripType === t);

  const short = packages.filter((p) => p.nights <= 4);
  const nearby = packages.filter((p) => facts.get(p.slug)!.region === 'UAE & Oman');
  const groups = packages.filter(suitsGroups);
  const tiles = [
    { label: 'Golf breaks', href: `${journeys}?length=short`, list: short },
    { label: 'Play close to home', href: `${journeys}?region=${encodeURIComponent('UAE & Oman')}`, list: nearby },
    ...(['all-inclusive', 'beach', 'links', 'championship', 'touring'] as GolfTripTypeKey[]).map((t) => ({
      label: GOLF_TRIP_TYPES.find((x) => x.key === t)!.label,
      href: `${journeys}?type=${t}`,
      list: ofType(t),
    })),
    { label: 'Groups & societies', href: `${base}/groups`, list: groups },
  ].filter((t) => t.list.length > 0);

  // Each tile gets a photograph no other tile is using: a trip's hero first,
  // then its gallery, so neighbouring tiles never show the same picture.
  const used = new Set<string>();
  const tilePhoto = (list: Package[]) => {
    for (const pool of [list.map((p) => p.heroImage), list.flatMap((p) => p.gallery ?? [])]) {
      const pick = pool.find((src) => src && !used.has(src));
      if (pick) {
        used.add(pick);
        return pick;
      }
    }
    return null;
  };
  const tilePhotos = tiles.map((t) => tilePhoto(t.list));
  // The groups banner sits below the cards, so it takes a picture they do not use either.
  for (const p of [...packages].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 8)) used.add(p.heroImage);
  const groupsPhoto = tilePhoto(groups);

  // Featured first, then the rest; eight cards, as two rows of four.
  const featured = [...packages].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 8);
  const monthCount = (m: number) =>
    filterGolf(packages, parseGolfCriteria({ month: String(m) }), seasonality).length;

  const tabs: BrowseTab[] = [
    {
      key: 'countries',
      label: 'Popular countries',
      groups: geography.map((g) => ({
        heading: g.region,
        links: [
          ...g.countries.map((c) => ({ href: `${journeys}?country=${c.slug}`, label: `${c.country} golf holidays` })),
          { href: `${journeys}?region=${encodeURIComponent(g.region)}`, label: `See all ${g.region} →` },
        ],
      })),
    },
    {
      key: 'types',
      label: 'Holiday types',
      groups: [
        {
          heading: 'By kind of trip',
          links: GOLF_TRIP_TYPES.filter((t) => ofType(t.key).length > 0).map((t) => ({ href: `${journeys}?type=${t.key}`, label: t.label })),
        },
        {
          heading: 'By party',
          links: [
            { href: `${base}/groups`, label: 'Groups & societies' },
            { href: `${journeys}?group=1`, label: 'Trips that suit groups' },
          ],
        },
        {
          heading: 'By board',
          links: [
            { href: `${journeys}?board=all-inclusive`, label: 'All-inclusive' },
            { href: `${journeys}?board=half-board`, label: 'Half board' },
            { href: `${journeys}?board=breakfast`, label: 'Bed & breakfast' },
          ],
        },
      ],
    },
    {
      key: 'length',
      label: 'Trip length',
      groups: [
        {
          heading: 'How long',
          links: GOLF_LENGTHS.map((l) => ({ href: `${journeys}?length=${l.key}`, label: l.label })),
        },
        {
          heading: 'How much golf',
          links: [
            { href: `${journeys}?rounds=2`, label: '2 rounds' },
            { href: `${journeys}?rounds=3`, label: '3 rounds' },
            { href: `${journeys}?rounds=4`, label: '4 rounds' },
            { href: `${journeys}?rounds=5`, label: '5 rounds or more' },
          ],
        },
      ],
    },
  ];

  return (
    <main>
      {/* Search band */}
      <section className="bg-gradient-to-br from-golf-navy via-golf-navy-soft to-fairway-deep text-white">
        <div className="container-site pb-10 pt-8 sm:pb-12 sm:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-[-0.015em] sm:text-4xl">Book golf holidays &amp; breaks</h1>
              <p className="mt-1.5 text-white/80">Golf packages from the UAE with named courses, nights and rounds — and the freedom to change them.</p>
            </div>
            <p className="text-right text-xs leading-relaxed text-white/70">
              Priced in AED · Planned in Dubai<br />
              <span className="font-bold text-white">Licensed UAE travel agency</span>
            </p>
          </div>

          <form action={journeys} method="get" role="search"
            className="mt-6 grid overflow-hidden rounded-2xl bg-white text-golf-navy shadow-xl sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_auto] lg:rounded-full">
            <label className="border-b border-golf-line px-5 py-3 lg:border-b-0 lg:border-r">
              <span className="block text-[11px] font-extrabold">Where do you want to play?</span>
              <select name="country" defaultValue="" className="mt-0.5 w-full bg-transparent text-sm text-ink-soft outline-none">
                <option value="">Anywhere</option>
                {geography.map((g) => (
                  <optgroup key={g.region} label={g.region}>
                    {g.countries.map((c) => <option key={c.slug} value={c.slug}>{c.country}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="border-b border-golf-line px-5 py-3 sm:border-l lg:border-b-0 lg:border-l-0 lg:border-r">
              <span className="block text-[11px] font-extrabold">When</span>
              <select name="month" defaultValue="" className="mt-0.5 w-full bg-transparent text-sm text-ink-soft outline-none">
                <option value="">Any month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label className="px-5 py-3">
              <span className="block text-[11px] font-extrabold">How long</span>
              <select name="length" defaultValue="" className="mt-0.5 w-full bg-transparent text-sm text-ink-soft outline-none">
                <option value="">Any length</option>
                {GOLF_LENGTHS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
            </label>
            <div className="p-2 sm:col-span-2 lg:col-span-1">
              <button type="submit" className="flex h-full w-full items-center justify-center gap-2 rounded-full bg-fairway px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-fairway-deep">
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Photo tiles */}
      <section className="pt-8">
        <div className="container-site grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {tiles.map((t, i) => {
            const img = tilePhotos[i];
            return (
              <Link key={t.label} href={t.href} className="group card overflow-hidden transition-shadow hover:shadow-lg">
                <div className="relative aspect-[16/9] bg-golf-mist">
                  {img && <Image src={img} alt="" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                </div>
                <p className="px-3 py-2.5 text-center text-sm font-extrabold text-golf-navy group-hover:text-fairway">
                  {t.label}
                  <span className="ml-1 font-semibold text-ink-soft">({t.list.length})</span>
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Reasons — only what is true of every trip today */}
      <section className="py-8">
        <div className="container-site grid gap-4 rounded-2xl bg-golf-mist p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
          {[
            ['Named courses', 'Every trip shows where you stay, the courses, nights and rounds.'],
            ['Tee times confirmed', 'Each club confirms your tee times before you pay anything.'],
            ['Flights from home', 'Dubai, Abu Dhabi or Sharjah flights quoted for your dates.'],
            ['A Dubai team', 'Call or message the people planning your trip.'],
          ].map(([title, body]) => (
            <div key={title} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fairway text-white">
                <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5 9-10" /></svg>
              </span>
              <div>
                <p className="font-extrabold text-golf-navy">{title}</p>
                <p className="text-sm text-ink-soft">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {offers.length > 0 && (
        <section className="pb-10">
          <div className="container-site">
            <SectionHead title="Golf offers" sub="Dated deals, priced from the UAE." href={`${base}/offers`} cta="All offers" />
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {offers.slice(0, 3).map((o) => <OfferCard key={o.id} offer={o} enquireBase={base} />)}
            </div>
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section className="pb-12">
          <div className="container-site">
            <SectionHead title="Featured golf holidays" sub="Starting points with named courses — every one reshapes around your dates." href={journeys} cta={`All ${packages.length} trips`} />
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((p, i) => <GolfCard key={p.slug} pkg={p} href={`${journeys}/${p.slug}`} priority={i < 4} />)}
            </div>
            <div className="mt-8 text-center">
              <Link href={journeys} className="btn-outline !px-8">See all golf holidays</Link>
            </div>
          </div>
        </section>
      )}

      {/* By month */}
      <section className="border-t border-golf-line py-12">
        <div className="container-site">
          <SectionHead title="Golf holidays by month" sub="Where the golf is good, month by month." />
          <div className="mt-6 grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-12">
            {MONTHS.map((m, i) => {
              const n = monthCount(i + 1);
              return (
                <Link key={m} href={`${journeys}?month=${i + 1}`}
                  className="group flex aspect-square flex-col items-center justify-center rounded-lg bg-gradient-to-br from-fairway to-golf-navy text-white transition-transform hover:-translate-y-0.5">
                  <span className="text-base font-extrabold">{m}</span>
                  <span className="text-[10px] font-semibold text-white/75">{n} trips</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Groups banner */}
      <section className="pb-12">
        <div className="container-site">
          <Link href={`${base}/groups`} className="group card grid overflow-hidden md:grid-cols-[1.2fr_1fr]">
            <div className="relative min-h-[220px] bg-golf-mist">
              {groupsPhoto && <Image src={groupsPhoto} alt="" fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" />}
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <p className="eyebrow">Groups &amp; societies</p>
              <h2 className="mt-2 text-2xl font-extrabold text-golf-navy">Organising golf for eight or more?</h2>
              <p className="mt-2 text-ink-soft">One per-person quote the whole group can read, rooms worked out and tee times requested together.</p>
              <span className="btn-primary mt-5 self-start">Plan a group trip</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Index */}
      <section className="border-t border-golf-line bg-white py-12">
        <div className="container-site">
          <SectionHead title="Browse golf holidays & golf breaks" sub="Every way into the catalogue — by country, kind of trip and length." />
          <div className="mt-6"><GolfBrowseTabs tabs={tabs} /></div>
        </div>
      </section>

      <section className="bg-golf-mist py-12">
        <div className="container-site flex flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-extrabold text-golf-navy">Not sure where to start?</h2>
          <p className="max-w-xl text-ink-soft">Tell a golf specialist your dates, how many are playing and what you want from the trip.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={`${base}/enquire`} className="btn-primary !px-7">Send us your trip brief</Link>
            <a href="tel:+97144206965" className="btn-outline !px-7">Call +971 4 420 6965</a>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionHead({ title, sub, href, cta }: { title: string; sub?: string; href?: string; cta?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-extrabold text-golf-navy">{title}</h2>
        {sub && <p className="mt-1 text-ink-soft">{sub}</p>}
      </div>
      {href && cta && (
        <Link href={href} className="text-sm font-bold text-fairway hover:underline">{cta} →</Link>
      )}
    </div>
  );
}
