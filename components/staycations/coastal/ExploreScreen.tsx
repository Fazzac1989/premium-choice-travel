import Image from 'next/image';
import Link from 'next/link';
import Icon from './Icon';
import StaySearchForm from './StaySearchForm';
import { CompactStayCard } from './StayCard';
import { getStaycationHotels } from '@/lib/data';
import { CATEGORIES } from '@/lib/staycations/filters';
import { criteriaQuery, type SearchCriteria } from '@/lib/staycations/search-criteria';
import { toStayCard } from '@/lib/staycations/stay-card';

/**
 * Explore — the app's first screen.
 *
 * A photograph, one sentence, and the search. Nothing here asks the supplier
 * for anything: prices arrive once someone has said when they are going,
 * which keeps the screen instant and the search budget for real intent.
 */

const CATEGORY_ICON = { wave: 'wave', dune: 'dune', spa: 'spa', family: 'family' } as const;

export default async function ExploreScreen({
  base,
  criteria,
  heroImage,
}: {
  base: string;
  criteria: SearchCriteria;
  heroImage: string;
}) {
  const hotels = await getStaycationHotels();

  // The rule behind "Selected for a slower weekend": a specialist has marked
  // the hotel as a pick, or tagged it as a long-weekend stay. No scoring.
  const curated = hotels
    .filter((h) => h.featured || (h.bestFor ?? []).includes('long weekend'))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || (b.stars ?? 0) - (a.stars ?? 0))
    .slice(0, 4)
    .map((h) => toStayCard(h, criteria, base));

  return (
    <div className="pb-10">
      {/* Hero + search. On a laptop the two sit side by side rather than
          stretching one phone column across the window. */}
      <section className="relative lg:pb-8">
        <div className="relative h-[420px] w-full sm:h-[460px] lg:h-[520px]">
          <Image src={heroImage} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="cc-scrim" />
          <div className="cc-wrap absolute inset-x-0 bottom-0 pb-24 lg:pb-16">
            <div className="max-w-xl text-white">
              <h1 className="cc-h1 lg:text-[44px] lg:leading-[48px]">Somewhere to slow down.</h1>
              <p className="mt-2 text-[16px] leading-[24px] text-white/85">Sea air. Slow mornings.</p>
            </div>
          </div>
        </div>

        <div className="cc-wrap relative -mt-16 lg:-mt-24">
          <div className="lg:grid lg:grid-cols-[1fr_400px] lg:items-end lg:gap-10">
            <div className="hidden lg:block" />
            <StaySearchForm base={base} initial={criteria} />
          </div>
        </div>
      </section>

      {/* Four ways in — each one a real filter, not a mood board. */}
      <section className="cc-wrap mt-7">
        <h2 className="sr-only">Browse by kind of stay</h2>
        <ul className="grid grid-cols-4 gap-2 sm:gap-4">
          {CATEGORIES.map((c) => (
            <li key={c.key}>
              <Link
                href={`${base}/hotels${criteriaQuery({ ...criteria, tag: c.key })}`}
                className="group flex flex-col items-center gap-2 rounded-[12px] p-1 text-center"
              >
                <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-mist text-petrol transition-colors group-hover:bg-petrol group-hover:text-white sm:h-[64px] sm:w-[64px]">
                  <Icon name={CATEGORY_ICON[c.category!.icon]} size={26} />
                </span>
                <span className="text-[13px] font-medium leading-[17px] text-sea-ink">{c.category!.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Curated stays */}
      {curated.length > 0 && (
        <section className="cc-wrap mt-8">
          <div className="flex items-end justify-between gap-4 border-t border-sea-line pt-5">
            <div>
              <h2 className="cc-h4">Selected for a slower weekend</h2>
              <p className="cc-support mt-0.5">Specialist picks — chosen by hand, never ranked by an algorithm.</p>
            </div>
            <Link
              href={`${base}/hotels${criteriaQuery(criteria)}`}
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1 text-[15px] font-semibold text-petrol"
            >
              See all
              <Icon name="chevron-right" size={16} />
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {curated.map((stay) => (
              <li key={stay.slug} className="min-w-0">
                <CompactStayCard stay={stay} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* One honest line about what this is, and the human behind it. */}
      <section className="cc-wrap mt-8">
        <div className="rounded-[12px] bg-mist p-5 lg:flex lg:items-center lg:justify-between lg:gap-6">
          <div>
            <h2 className="cc-h4">Booked by people, not a machine</h2>
            <p className="cc-body mt-1.5 max-w-xl text-sea-soft">
              Every stay is checked and confirmed by a Premium Choice specialist in Dubai. Prices come from our hotel
              partners; anything unusual, we will tell you before you commit.
            </p>
          </div>
          <a href="tel:+97144206965" className="cc-btn-quiet mt-4 lg:mt-0 lg:shrink-0">
            <Icon name="phone" size={18} />
            +971 4 420 6965
          </a>
        </div>
      </section>
    </div>
  );
}
