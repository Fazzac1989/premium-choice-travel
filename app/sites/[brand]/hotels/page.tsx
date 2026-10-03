import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccount } from '@/lib/account';
import Icon from '@/components/staycations/coastal/Icon';
import SearchPill from '@/components/staycations/trade/SearchPill';
import ResultRow from '@/components/staycations/trade/ResultRow';
import ResultsScreen from '@/components/staycations/trade/ResultsScreen';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getStaycationHotels, hotelSlug } from '@/lib/data';
import { priceBand } from '@/lib/price-bands';
import { ratesVisible } from '@/lib/rates';
import { runStaySearch } from '@/lib/staycations/stay-search-server';
import { tagByKey } from '@/lib/staycations/filters';
import {
  agesMissing,
  cityCodeForEmirate,
  datesLabel,
  parseStaySearch,
  partyLabel,
  isLiveDestination,
  staySearchQuery,
  UAE_DESTINATIONS,
} from '@/lib/staycations/stay-search';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Find your pause',
  description: 'Hotels across the UAE with live prices for your dates — book online and pay securely.',
};

/**
 * The results, laid out like the trade portal's (founder, 2026-10-03): the search pill on a sand
 * band, the destination as the heading, then the live list. Signed in with dates, every hotel the
 * platform holds for that emirate is searched; otherwise our curated stays are listed with their
 * guide prices and the visitor is asked to sign in — an anonymous visit never asks a supplier.
 */
export default async function StayResultsPage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const search = parseStaySearch(searchParams);
  const signedIn = Boolean(await getAccount());
  const canSeeRates = ratesVisible(signedIn);
  // a theme from the home screen (By the sea, Desert…) is one of our curated collections
  const tagParam = searchParams.tag;
  const tag = tagByKey(Array.isArray(tagParam) ? tagParam[0] ?? '' : tagParam ?? '');
  // only where the catalogue holds the bed banks' hotels (Dubai for now) is there anything to search
  const bookable = isLiveDestination(search.cityCode);
  const live = !tag && canSeeRates && Boolean(search.checkIn) && bookable && !agesMissing(search);
  const place = UAE_DESTINATIONS.find((d) => d.cityCode === search.cityCode)?.label ?? (search.where || 'the UAE');

  const initial = live ? await runStaySearch(search) : null;

  // without a live search: our curated stays for this emirate, with their guide prices
  const curated = live
    ? []
    : (await getStaycationHotels()).filter(
        (h) => (tag ? tag.matches(h) : true) && (!search.cityCode || cityCodeForEmirate(h.emirate) === search.cityCode),
      );
  const query = staySearchQuery({ checkIn: search.checkIn, nights: search.nights, adults: search.adults, childAges: search.childAges });

  const notice = tag
    ? { tone: 'quiet' as const, text: 'Our specialists’ picks. Open a stay to see live prices for your dates, or search an emirate above to see every hotel.' }
    : search.cityCode && !bookable
      ? {
          tone: 'quiet' as const,
          text: `Online booking is open for Dubai today, and ${place} is coming soon. These are our specialists’ picks here: ask us for prices and dates, and we will book it for you.`,
        }
    : agesMissing(search)
    ? { tone: 'wait' as const, text: 'Add each child’s age to see prices — hotels price children by age, so we will not guess one.' }
    : !canSeeRates
      ? { tone: 'quiet' as const, text: 'Sign in or create an account to search every hotel in the UAE with live prices for your dates, and book online.' }
      : !search.checkIn
        ? { tone: 'quiet' as const, text: 'Add your dates to see every hotel with a real total for your stay.' }
        : !search.cityCode
          ? { tone: 'quiet' as const, text: 'Choose an emirate or a hotel to see live prices.' }
          : null;

  return (
    <div>
      <div className="bg-shell">
        <div className="cc-wrap py-5 lg:py-7">
          <SearchPill base={base} initial={search} />
        </div>
      </div>

      <div className="cc-wrap py-6 lg:py-8">
        <h1 className="cc-h2 lg:text-[34px] lg:leading-[40px]">{tag ? tag.label : `Stays in ${place}`}</h1>
        {search.checkIn && (
          <p className="cc-body mt-1 text-sea-soft">
            {datesLabel(search.checkIn, search.nights)} · {partyLabel(search)}
          </p>
        )}

        {notice && (
          <p
            className={`mt-4 flex items-start gap-2 rounded-[10px] px-4 py-3 text-[14px] leading-[20px] ${
              notice.tone === 'wait' ? 'bg-wait-bg text-wait-ink' : 'bg-mist text-sea-soft'
            }`}
          >
            <Icon name="info" size={18} className="mt-0.5 shrink-0" />
            <span>
              {notice.text}
              {!signedIn && (
                <>
                  {' '}
                  <Link
                    href={`/account/sign-in?next=${encodeURIComponent(`${base}/hotels${staySearchQuery(search)}`)}`}
                    className="font-semibold text-petrol underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </span>
          </p>
        )}

        <div className="mt-5">
          {initial ? (
            <ResultsScreen base={base} search={search} initial={initial} />
          ) : curated.length === 0 ? (
            <div className="rounded-[12px] border border-sea-line p-8 text-center">
              <h2 className="cc-h4">No hand-picked stays here yet.</h2>
              <p className="cc-body mx-auto mt-2 max-w-md text-sea-soft">
                {bookable
                  ? `Sign in and add your dates to see every hotel in ${place}, or tell us what you have in mind.`
                  : 'Tell us what you have in mind and we will find it and book it for you.'}
              </p>
              <Link href={`${base}/concierge`} className="cc-btn-primary mt-5">
                Ask a specialist
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[15px] text-sea-ink">
                <strong>{curated.length}</strong> stay{curated.length === 1 ? '' : 's'} our specialists recommend
              </p>
              <ol className="mt-4 space-y-4">
                {curated.map((h, i) => (
                  <li key={h.id}>
                    <ResultRow
                      priority={i < 2}
                      m={{
                        key: String(h.id),
                        href: `${base}/hotels/${hotelSlug(h.name)}${query}`,
                        name: h.name,
                        area: [h.area, h.emirate].filter(Boolean).join(', '),
                        stars: h.stars ?? null,
                        image: h.image || h.gallery[0] || null,
                        specialistPick: true,
                        rate: null,
                        dates: null,
                        guide: priceBand(h.priceBand)?.label ?? null,
                        moreRooms: 0,
                      }}
                    />
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
