import Image from 'next/image';
import Link from 'next/link';
import Icon from './Icon';
import StaySearchForm from './StaySearchForm';
import { CompactStayCard } from './StayCard';
import { getStaycationHotels } from '@/lib/data';
import { CATEGORIES } from '@/lib/staycations/filters';
import { criteriaQuery, type SearchCriteria } from '@/lib/staycations/search-criteria';
import { toStayCard } from '@/lib/staycations/stay-card';
import { pickHero } from '@/lib/staycations/hero';
import { placeGroups } from '@/lib/staycations/places';

/**
 * Explore — the app's first screen.
 *
 * A photograph, what this is, and the search. Nothing here asks the supplier
 * for anything: prices arrive once someone has said when they are going,
 * which keeps the screen instant and the search budget for real intent.
 *
 * Dates start empty on purpose. A pre-filled weekend looks like an answer to
 * a question nobody asked, and it quietly decides when someone is travelling.
 */

const CATEGORY_ICON = { wave: 'wave', dune: 'dune', spa: 'spa', family: 'family' } as const;

export default async function ExploreScreen({
  base,
  criteria,
}: {
  base: string;
  criteria: SearchCriteria;
}) {
  const hero = pickHero();
  const hotels = await getStaycationHotels();
  const places = placeGroups(hotels.map((h) => h.emirate ?? ''));

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
        {/* The bar floats over the top of this photograph. */}
        <div className="relative h-[480px] w-full sm:h-[520px] lg:h-[588px]">
          <Image src={hero.src} alt={hero.alt} fill priority sizes="100vw" className="object-cover" />
          <div className="cc-scrim" />
          <div className="cc-wrap absolute inset-x-0 bottom-0 pb-24 lg:pb-32">
            <div className="max-w-2xl text-white">
              <h1 className="cc-h1 text-balance lg:text-[44px] lg:leading-[50px]">
                A better weekend is closer than you think.
              </h1>
              <p className="mt-3 max-w-xl text-[16px] leading-[24px] text-white/90 lg:text-[18px] lg:leading-[27px]">
                Handpicked UAE stays, with a local travel specialist when you need one.
              </p>
            </div>
          </div>
        </div>

        {/* One wide bar across the page rather than a card in the corner:
            on a laptop the fields sit in a row and fill the window. */}
        <div className="cc-wrap relative -mt-16 lg:-mt-20">
          <StaySearchForm base={base} initial={criteria} places={places} />
          {/* The quiet alternative to searching: ask someone. */}
          <p className="mt-3.5 text-center text-[15px] leading-[22px] text-sea-soft">
            Not sure where to go?{' '}
            <Link
              href={`${base}/concierge`}
              className="font-semibold text-petrol underline decoration-petrol/30 underline-offset-4 hover:decoration-petrol"
            >
              Ask our Dubai-based team.
            </Link>
          </p>
        </div>
      </section>

      {/* Four ways in — each one a real filter, not a mood board. */}
      <section className="cc-wrap mt-9">
        <h2 className="cc-h4">What kind of escape do you need?</h2>
        <ul className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
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
