import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAccount } from '@/lib/account';
import AvailabilityCheck from '@/components/AvailabilityCheck';
import Icon from '@/components/staycations/coastal/Icon';
import HotelGallery from '@/components/staycations/trade/HotelGallery';
import { RoomChoiceProvider, RoomList, StayPanel } from '@/components/staycations/trade/RoomChoice';
import SearchPill from '@/components/staycations/trade/SearchPill';
import SaveHotelButton from '@/components/staycations/SaveHotelButton';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { ratesVisible } from '@/lib/rates';
import { resolveStay, stayRates } from '@/lib/staycations/stay-search-server';
import {
  agesMissing,
  cityCodeForEmirate,
  datesLabel,
  parseStaySearch,
  partyLabel,
  staySearchQuery,
  type PublicRate,
} from '@/lib/staycations/stay-search';
import type { VenueSection } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { brand: string; slug: string } }) {
  const stay = await resolveStay(params.slug);
  if (!stay) return {};
  const about = stay.curated?.description || stay.curated?.intro[0] || stay.content?.description || '';
  return {
    title: `${stay.name}${stay.city ? ` — ${stay.city}` : ''}`,
    description: about.slice(0, 155) || `${stay.name}: live prices and online booking.`,
    // a hotel only the platform knows has no write-up of ours: not worth an index entry
    ...(stay.curated ? {} : { robots: { index: false, follow: true } }),
  };
}

/**
 * A hotel, laid out like the trade portal's hotel page (founder, 2026-10-03): the gallery, a
 * section nav, the description, the rooms grouped by type, and a sticky "Your stay" panel that
 * books the chosen room. Our curated hotels keep their own write-up; any other UAE hotel on the
 * platform shows the platform's description and photographs.
 */
export default async function StayPage({
  params,
  searchParams,
}: {
  params: { brand: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const stay = await resolveStay(params.slug);
  if (!stay) notFound();
  const { curated, content } = stay;

  const search = parseStaySearch(searchParams);
  const signedIn = Boolean(await getAccount());
  const canSeeRates = ratesVisible(signedIn);
  const wantsRates = canSeeRates && Boolean(search.checkIn) && !agesMissing(search) && Boolean(stay.platformId);
  const { rates, problem } = wantsRates ? await stayRates(stay.platformId!, search) : { rates: [] as PublicRate[], problem: null };

  const images = [...(curated?.gallery?.length ? curated.gallery : content?.images ?? [])].slice(0, 24);
  const stars = curated?.stars ?? (content?.starRating ? Math.round(content.starRating) : null);
  const about = curated?.intro.length ? curated.intro : [curated?.description || content?.description || ''].filter(Boolean);
  const cityCode = cityCodeForEmirate(stay.city);
  const backHref = `${base}/hotels${staySearchQuery({ ...search, where: stay.city, cityCode, sort: 'best', refundable: false, board: null, minStars: null })}`;
  const here = `${base}/hotels/${params.slug}${staySearchQuery(search)}`;

  const roomsNotice = agesMissing(search)
    ? 'Add each child’s age to see prices — hotels price children by age.'
    : !canSeeRates
      ? 'Sign in or create an account to see live prices for your dates and book online.'
      : !search.checkIn
        ? 'Choose your dates to see the rooms and their prices.'
        : !stay.platformId
          ? 'This stay is booked through our specialists: send us your dates below.'
          : problem
            ? problem
            : rates.length === 0
              ? 'Nothing is available for these dates. Try other nights, or ask us below and we will look properly.'
              : null;

  const sections = [
    ['overview', 'Overview'],
    ['rooms', 'Rooms'],
    ['good-to-know', 'Good to know'],
    ...(curated?.gettingThere ? [['getting-there', 'Getting there'] as const] : []),
    ['ask', 'Ask us'],
  ] as const;

  return (
    <div className="pb-10">
      <div className="cc-wrap pt-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[14px] text-sea-soft">
          <Link href={backHref} className="inline-flex items-center gap-1 font-medium text-petrol hover:underline">
            <Icon name="chevron-left" size={16} />
            Stays in {stay.city || 'the UAE'}
          </Link>
        </nav>

        <div className="mt-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="cc-h2 lg:text-[34px] lg:leading-[40px]">{stay.name}</h1>
            {curated && <SaveHotelButton slug={params.slug} name={stay.name} savedColor="#164B57" className="shrink-0 border border-sea-line" />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-sea-soft">
            {stars ? (
              <span className="text-petrol" aria-label={`${stars} star hotel`}>
                {'★'.repeat(stars)}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={15} />
              {[curated?.area, stay.city].filter(Boolean).join(', ')}
            </span>
            {content?.address && <span>{content.address}</span>}
            {curated && <span className="cc-badge-quiet">Specialist pick</span>}
          </p>
        </div>

        <div className="mt-4">
          <HotelGallery images={images} name={stay.name} />
        </div>

        <RoomChoiceProvider rates={rates}>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0">
              <nav aria-label="On this page" className="sticky top-16 z-10 -mx-4 overflow-x-auto border-b border-sea-line bg-white px-4 lg:top-20">
                <ul className="flex gap-5 whitespace-nowrap text-[14px] font-medium text-sea-soft">
                  {sections.map(([id, label]) => (
                    <li key={id}>
                      <a href={`#${id}`} className="inline-block py-3 hover:text-petrol">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <section id="overview" className="scroll-mt-32 pt-6">
                <h2 className="cc-h3">Overview</h2>
                {about.length ? (
                  about.map((p, i) => (
                    <p key={i} className="cc-body mt-3 whitespace-pre-line text-sea-ink">
                      {p}
                    </p>
                  ))
                ) : (
                  <p className="cc-body mt-3 text-sea-soft">The hotel has not sent us a description yet.</p>
                )}
                {curated?.features?.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {curated.features.slice(0, 10).map((f) => (
                      <li key={f} className="rounded-full bg-mist px-3 py-1 text-[13px] text-sea-ink">
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section id="rooms" className="scroll-mt-32 pt-8">
                <h2 className="cc-h3">Rooms</h2>
                {search.checkIn && (
                  <p className="cc-support mt-1">
                    {datesLabel(search.checkIn, search.nights)} · {partyLabel(search)} · prices are for the whole stay, taxes in
                  </p>
                )}
                {roomsNotice && (
                  <p className="mt-3 flex items-start gap-2 rounded-[10px] bg-mist px-4 py-3 text-[14px] leading-[20px] text-sea-soft">
                    <Icon name="info" size={18} className="mt-0.5 shrink-0" />
                    <span>
                      {roomsNotice}
                      {!signedIn && (
                        <>
                          {' '}
                          <Link href={`/account/sign-in?next=${encodeURIComponent(here)}`} className="font-semibold text-petrol underline underline-offset-4">
                            Sign in
                          </Link>
                        </>
                      )}
                    </span>
                  </p>
                )}
                {signedIn && (
                  <div className="mt-4">
                    <SearchPill base={base} initial={search} hotel={{ name: stay.name, slug: params.slug }} />
                  </div>
                )}
                {rates.length > 0 && (
                  <div className="mt-4">
                    <RoomList nights={search.nights} />
                  </div>
                )}
              </section>

              <section id="good-to-know" className="scroll-mt-32 pt-8">
                <h2 className="cc-h3">Good to know</h2>
                <dl className="mt-3 grid gap-3 text-[15px] sm:grid-cols-2">
                  {content?.checkInTime && (
                    <div>
                      <dt className="cc-label">Check-in</dt>
                      <dd className="text-sea-ink">From {content.checkInTime.slice(0, 5)}</dd>
                    </div>
                  )}
                  {content?.checkOutTime && (
                    <div>
                      <dt className="cc-label">Check-out</dt>
                      <dd className="text-sea-ink">Until {content.checkOutTime.slice(0, 5)}</dd>
                    </div>
                  )}
                  {curated?.mealPlans?.length ? (
                    <div>
                      <dt className="cc-label">Meal plans</dt>
                      <dd className="text-sea-ink">{curated.mealPlans.join(' · ')}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="cc-label">Paid at the hotel</dt>
                    <dd className="text-sea-ink">The tourism dirham fee and any security deposit</dd>
                  </div>
                  <div>
                    <dt className="cc-label">Cancelling</dt>
                    <dd className="text-sea-ink">Each room shows its own terms; cancel online from My trips while they allow</dd>
                  </div>
                </dl>
                {(curated?.restaurants as VenueSection[] | undefined)?.length ? (
                  <div className="mt-5">
                    <h3 className="cc-h4 text-[17px]">Eating and drinking</h3>
                    <ul className="mt-2 space-y-2">
                      {(curated!.restaurants as VenueSection[]).map((r) => (
                        <li key={r.heading} className="text-[15px]">
                          <span className="font-semibold text-sea-ink">{r.heading}</span>
                          <span className="text-sea-soft"> — {r.body}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              {curated?.gettingThere && (
                <section id="getting-there" className="scroll-mt-32 pt-8">
                  <h2 className="cc-h3">Getting there</h2>
                  <p className="cc-body mt-3 whitespace-pre-line text-sea-ink">{curated.gettingThere}</p>
                </section>
              )}

              <section id="ask" className="scroll-mt-32 pt-10">
                <div className="rounded-[12px] bg-petrol-deep p-5 text-white lg:max-w-xl">
                  <h2 className="cc-h4 text-white">
                    {rates.length > 0 ? `Can't find what you are looking for at ${stay.name}?` : `Ask about ${stay.name}`}
                  </h2>
                  <p className="mt-1 text-[14px] leading-[20px] text-white/70">
                    Another room type, more than one room, or a date that is not showing — send it over and a specialist
                    replies with what is available and what it costs, usually the same working day.
                  </p>
                  <div className="mt-4">
                    <AvailabilityCheck
                      hotelName={stay.name}
                      hotelHref={`${base}/hotels/${params.slug}`}
                      emirate={stay.city}
                      mealPlans={curated?.mealPlans ?? []}
                      defaultCheckIn={search.checkIn ?? ''}
                      defaultNights={search.nights}
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              {rates.length > 0 && search.checkIn ? (
                <StayPanel
                  base={base}
                  slug={params.slug}
                  dates={datesLabel(search.checkIn, search.nights)}
                  party={partyLabel(search)}
                  nights={search.nights}
                />
              ) : (
                <div className="cc-panel p-5">
                  <h2 className="cc-h4 text-[19px]">Your stay</h2>
                  <p className="cc-body mt-2 text-sea-soft">
                    {!signedIn
                      ? 'Sign in to see live prices for your dates and book online.'
                      : search.checkIn
                        ? 'Choose another date or ask us: we can often find a room the website cannot.'
                        : 'Choose your dates to see the rooms and book.'}
                  </p>
                  {!signedIn ? (
                    <Link href={`/account/sign-in?next=${encodeURIComponent(here)}`} className="cc-btn-primary mt-4 w-full !rounded-full">
                      Sign in or create an account
                    </Link>
                  ) : (
                    <a href="#rooms" className="cc-btn-primary mt-4 w-full !rounded-full">
                      Choose dates
                    </a>
                  )}
                  <a href="tel:+97144206965" className="cc-btn-quiet mt-3 w-full !rounded-full">
                    <Icon name="phone" size={18} />
                    +971 4 420 6965
                  </a>
                </div>
              )}
            </aside>
          </div>
        </RoomChoiceProvider>
      </div>
    </div>
  );
}
