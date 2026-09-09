'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from './Icon';
import { useHideTabBar } from './Chrome';
import type { PublicRoomOffer } from '@/lib/rates/types';
import { boardLabel as tidyBoard, roomLabel } from '@/lib/staycations/format';

/**
 * Everything below the photographs on a stay page.
 *
 * The room a customer picks decides the price, the board, the cancellation
 * terms and what is included — so one component owns the selection and every
 * line that depends on it. Nothing here is decorative: each claim is read off
 * the chosen rate, or off the property's own facts and labelled as such.
 */

type Section = { heading: string; body: string };

export type StayDetailProps = {
  base: string;
  hotelName: string;
  /** Rate options for the searched dates. Empty when we have not priced them. */
  offers: PublicRoomOffer[];
  /** Room categories from our own content — shown when there are no live rates. */
  roomTypes: Section[];
  intro: string[];
  features: string[];
  restaurants: Section[];
  gettingThere: string;
  mealPlans: string[];
  stars: number | null;
  style: string;
  bandLabel: string | null;
  /** "2 nights · 2 adults" */
  basis: string;
  nights: number;
  dateLabel: string;
  hasDates: boolean;
  /** True when a request can be sent against a live rate. */
  canBook: boolean;
  /** Where the request screen lives; the chosen rate is appended. */
  bookHref: string;
  /** Why there is no live price, in plain words. Null when there is one. */
  ratesNotice: string | null;
};

const money = (n: number) => n.toLocaleString('en-GB', { maximumFractionDigits: 0 });

const SPECIAL_REQUESTS = [
  'Early check-in',
  'Late checkout',
  'Connecting rooms',
  'Cot or baby equipment',
  'High floor',
  'Quiet room',
  'Twin beds',
  'Anniversary or birthday',
];

export default function StayDetail(props: StayDetailProps) {
  const { offers, canBook, basis, nights, hotelName, base } = props;
  // This screen owns the bottom of the window: price and one action.
  useHideTabBar();

  const [tab, setTab] = useState<'overview' | 'rooms' | 'inclusions'>('overview');
  const [offerId, setOfferId] = useState(offers[0]?.offerId ?? '');
  const [termsOpen, setTermsOpen] = useState(false);
  const selected = offers.find((o) => o.offerId === offerId) ?? offers[0] ?? null;

  const chooseRoom = (id: string) => {
    setOfferId(id);
    setTab('overview');
  };

  const requestHref = selected ? `${props.bookHref}${props.bookHref.includes('?') ? '&' : '?'}offer=${encodeURIComponent(selected.offerId)}` : props.bookHref;

  const boardLabel = (o: PublicRoomOffer) => tidyBoard(o.board);
  const cancelLabel = (o: PublicRoomOffer) =>
    o.refundable === false
      ? 'Non-refundable'
      : o.cancelBy
        ? `Free cancellation until ${o.cancelBy.slice(0, 10)}`
        : 'Cancellation terms on request';

  const tabButton = (key: typeof tab, label: string) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={tab === key}
      aria-controls={`panel-${key}`}
      id={`tab-${key}`}
      onClick={() => setTab(key)}
      className={`min-h-[48px] flex-1 border-b-2 px-2 text-[15px] font-medium transition-colors ${
        tab === key ? 'border-petrol text-petrol' : 'border-transparent text-sea-soft hover:text-sea-ink'
      }`}
    >
      {label}
    </button>
  );

  /** Property facts worth stating, kept apart from what the rate includes. */
  const propertyFacts = props.features
    .filter((f) => /pool|beach|kids|spa|restaurant|parking|gym|wifi|water/i.test(f))
    .slice(0, 6);

  return (
    <>
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-10">
        <div className="min-w-0">
          {/* Tabs */}
          <div role="tablist" aria-label="About this stay" className="flex border-b border-sea-line">
            {tabButton('overview', 'Overview')}
            {tabButton('rooms', 'Rooms')}
            {tabButton('inclusions', 'Inclusions')}
          </div>

          {/* ── Overview ─────────────────────────────────────── */}
          {tab === 'overview' && (
            <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="pt-5">
              <h2 className="cc-h4">Select your room</h2>
              {selected ? (
                <button
                  type="button"
                  onClick={() => setTab('rooms')}
                  className="mt-3 flex w-full items-center gap-3 rounded-[12px] border border-sea-line bg-white p-3 text-left transition-colors hover:border-petrol"
                >
                  <span className="flex h-[62px] w-[86px] shrink-0 items-center justify-center rounded-[8px] bg-mist text-petrol">
                    <Icon name="bed" size={26} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-medium leading-[22px] text-sea-ink">
                      {roomLabel(selected.roomName)}
                    </span>
                    <span className="cc-support block">
                      {basis} · {boardLabel(selected)}
                    </span>
                    <span className="cc-support block truncate">{props.dateLabel}</span>
                  </span>
                  <Icon name="chevron-right" size={20} className="shrink-0 text-sea-soft" />
                </button>
              ) : (
                <div className="mt-3 rounded-[12px] border border-sea-line bg-shell p-4">
                  <p className="text-[15px] text-sea-ink">
                    {props.ratesNotice ?? 'Choose your dates to see the rooms available.'}
                  </p>
                  {props.bandLabel && (
                    <p className="cc-support mt-1">Guide price {props.bandLabel} a night, per room for two adults.</p>
                  )}
                </div>
              )}
              {offers.length > 1 && (
                <button type="button" onClick={() => setTab('rooms')} className="mt-2 text-[15px] font-semibold text-petrol">
                  See all {offers.length} room options
                </button>
              )}

              {/* Included */}
              <h2 className="cc-h4 mt-7">Included in your escape</h2>
              <ul className="mt-3 space-y-2.5 rounded-[12px] bg-shell p-4">
                <li className="flex items-start gap-3">
                  <Icon name="moon" size={20} className="mt-0.5 shrink-0 text-petrol" />
                  <span className="text-[15px] leading-[22px] text-sea-ink">
                    {nights} night{nights === 1 ? '' : 's'}
                    {props.hasDates ? ` — ${props.dateLabel}` : ''}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="breakfast" size={20} className="mt-0.5 shrink-0 text-petrol" />
                  <span className="text-[15px] leading-[22px] text-sea-ink">
                    {selected ? boardLabel(selected) : `Meal plans available: ${props.mealPlans.join(', ') || 'on request'}`}
                    {selected && <span className="cc-support block">Included in the total below</span>}
                  </span>
                </li>
                {propertyFacts.length > 0 && (
                  <li className="flex items-start gap-3">
                    <Icon name="umbrella" size={20} className="mt-0.5 shrink-0 text-petrol" />
                    <span className="text-[15px] leading-[22px] text-sea-ink">
                      {propertyFacts.slice(0, 2).join(' · ')}
                      <span className="cc-support block">At the property — not part of the room rate</span>
                    </span>
                  </li>
                )}
              </ul>
              {selected && selected.extraFees.length > 0 && (
                <p className="cc-support mt-2">
                  Payable at the hotel, on top of the total:{' '}
                  {selected.extraFees.map((f) => `${f.currency} ${money(f.amount)} ${f.description}`).join(', ')}.
                </p>
              )}

              {/* Special requests */}
              <h2 className="cc-h4 mt-7">Special requests</h2>
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-3 rounded-[12px] border border-sea-line p-4">
                  <Icon name="note" size={20} className="mt-0.5 shrink-0 text-petrol" />
                  <div>
                    <p className="text-[15px] font-medium text-sea-ink">Ask the hotel for something</p>
                    <p className="cc-support mt-0.5">
                      {SPECIAL_REQUESTS.slice(0, 4).join(' · ')} and more. Add them with your request — every one is
                      subject to confirmation by the hotel and none is guaranteed.
                    </p>
                  </div>
                </div>

                <div className="rounded-[12px] border border-sea-line">
                  <button
                    type="button"
                    onClick={() => setTermsOpen((v) => !v)}
                    aria-expanded={termsOpen}
                    className="flex min-h-[56px] w-full items-center gap-3 p-4 text-left"
                  >
                    <Icon name="document" size={20} className="shrink-0 text-petrol" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-sea-ink">Cancellation terms</span>
                      <span className="cc-support block truncate">
                        {selected ? cancelLabel(selected) : 'Confirmed with your dates'}
                      </span>
                    </span>
                    <Icon name={termsOpen ? 'chevron-down' : 'chevron-right'} size={20} className="shrink-0 text-sea-soft" />
                  </button>
                  {termsOpen && (
                    <div className="border-t border-sea-line p-4">
                      {selected ? (
                        <>
                          <p className="text-[15px] leading-[22px] text-sea-ink">
                            {selected.refundable === false
                              ? 'This rate is non-refundable. Once confirmed, the full amount is charged even if you cancel.'
                              : selected.cancelBy
                                ? `Cancel free of charge until ${selected.cancelBy.slice(0, 16).replace('T', ' ')} at the hotel’s local time. After that the hotel’s charge applies.`
                                : 'The hotel has not published cancellation terms for this rate. A specialist confirms them in writing before anything is booked.'}
                          </p>
                          {selected.comments && (
                            <p className="cc-support mt-2 whitespace-pre-line">{selected.comments}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[15px] leading-[22px] text-sea-ink">
                          Terms depend on the rate and the dates. Add your dates and they appear here, in full, before
                          you send anything.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Our take */}
              {props.intro.length > 0 && (
                <>
                  <h2 className="cc-h4 mt-7">Why we rate it</h2>
                  <div className="mt-3 space-y-3">
                    {props.intro.map((p, i) => (
                      <p key={i} className="cc-body text-sea-soft">
                        {p}
                      </p>
                    ))}
                  </div>
                </>
              )}

              {props.gettingThere && (
                <>
                  <h2 className="cc-h4 mt-7">Getting there</h2>
                  <p className="cc-body mt-2 text-sea-soft">{props.gettingThere}</p>
                </>
              )}
            </div>
          )}

          {/* ── Rooms ────────────────────────────────────────── */}
          {tab === 'rooms' && (
            <div id="panel-rooms" role="tabpanel" aria-labelledby="tab-rooms" className="pt-5">
              {offers.length > 0 ? (
                <>
                  <h2 className="cc-h4">Rooms for {props.dateLabel}</h2>
                  <p className="cc-support mt-1">Every price is the total for {basis.toLowerCase()}.</p>
                  <ul className="mt-3 space-y-2" role="radiogroup" aria-label="Room options">
                    {offers.map((o) => {
                      const on = o.offerId === selected?.offerId;
                      return (
                        <li key={o.offerId}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => chooseRoom(o.offerId)}
                            className={`w-full rounded-[12px] border p-4 text-left transition-colors ${
                              on ? 'border-petrol bg-mist/50' : 'border-sea-line bg-white hover:border-petrol'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-[16px] font-medium leading-[22px] text-sea-ink">{roomLabel(o.roomName)}</p>
                                <p className="cc-support mt-0.5">{boardLabel(o)}</p>
                                <p className={`mt-1 text-[13px] leading-[19px] ${o.refundable === false ? 'text-sea-soft' : 'text-ok-ink'}`}>
                                  {cancelLabel(o)}
                                </p>
                                {o.extraFees.length > 0 && (
                                  <p className="cc-support mt-1">
                                    Plus {o.extraFees.map((f) => `${f.currency} ${money(f.amount)} ${f.description}`).join(', ')} at the hotel
                                  </p>
                                )}
                                {o.promotions && o.promotions.length > 0 && (
                                  <p className="mt-1 text-[13px] leading-[19px] text-ok-ink">{o.promotions.join(' · ')}</p>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="cc-price">
                                  {o.currency} {money(o.total)}
                                </p>
                                <p className="cc-support">total</p>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <>
                  <h2 className="cc-h4">Room categories</h2>
                  <p className="cc-support mt-1">
                    {props.ratesNotice ?? 'Add your dates to see which of these are available, and what they cost.'}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {props.roomTypes.map((r) => (
                      <li key={r.heading} className="rounded-[12px] border border-sea-line p-4">
                        <p className="text-[16px] font-medium text-sea-ink">{r.heading}</p>
                        <p className="cc-support mt-1">{r.body}</p>
                      </li>
                    ))}
                    {props.roomTypes.length === 0 && (
                      <li className="rounded-[12px] bg-shell p-4 text-[15px] text-sea-soft">
                        A specialist will talk you through the room types at {hotelName}.
                      </li>
                    )}
                  </ul>
                  <p className="cc-support mt-3">
                    Room categories are confirmed for your dates and party before anything is booked.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Inclusions ───────────────────────────────────── */}
          {tab === 'inclusions' && (
            <div id="panel-inclusions" role="tabpanel" aria-labelledby="tab-inclusions" className="pt-5">
              <h2 className="cc-h4">What the price covers</h2>
              {selected ? (
                <ul className="mt-3 space-y-2">
                  <li className="flex items-start gap-3 rounded-[10px] bg-ok-bg p-3">
                    <Icon name="check" size={18} className="mt-0.5 shrink-0 text-ok-ink" />
                    <span className="text-[15px] leading-[22px] text-ok-ink">
                      {nights} night{nights === 1 ? '' : 's'} in a {roomLabel(selected.roomName).toLowerCase()}, {boardLabel(selected).toLowerCase()}, for {basis.split('·')[1]?.trim() ?? basis}
                    </span>
                  </li>
                  <li className="flex items-start gap-3 rounded-[10px] bg-ok-bg p-3">
                    <Icon name="check" size={18} className="mt-0.5 shrink-0 text-ok-ink" />
                    <span className="text-[15px] leading-[22px] text-ok-ink">
                      {selected.extraFees.length === 0
                        ? 'Taxes and fees the hotel bills us are included in the total.'
                        : 'Taxes are included except the charges listed below, which the hotel collects itself.'}
                    </span>
                  </li>
                </ul>
              ) : (
                <p className="cc-body mt-2 text-sea-soft">
                  {props.ratesNotice ?? 'Add your dates and the exact inclusions for each rate appear here.'}
                </p>
              )}

              <h2 className="cc-h4 mt-7">Not included</h2>
              <ul className="mt-3 space-y-2">
                {(selected?.extraFees ?? []).map((f) => (
                  <li key={f.description} className="flex items-start gap-3 rounded-[10px] bg-wait-bg p-3">
                    <Icon name="info" size={18} className="mt-0.5 shrink-0 text-wait-ink" />
                    <span className="text-[15px] leading-[22px] text-wait-ink">
                      {f.currency} {money(f.amount)} {f.description} — paid at the hotel
                    </span>
                  </li>
                ))}
                <li className="flex items-start gap-3 rounded-[10px] bg-shell p-3">
                  <Icon name="info" size={18} className="mt-0.5 shrink-0 text-sea-soft" />
                  <span className="text-[15px] leading-[22px] text-sea-soft">
                    Anything you spend at the hotel — restaurants, spa, activities — unless your board plan covers it.
                  </span>
                </li>
              </ul>

              <h2 className="cc-h4 mt-7">Meal plans at this hotel</h2>
              <p className="cc-body mt-2 text-sea-soft">
                {props.mealPlans.length ? props.mealPlans.join(' · ') : 'Confirmed with your specialist.'}
              </p>

              {propertyFacts.length > 0 && (
                <>
                  <h2 className="cc-h4 mt-7">At the property</h2>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {propertyFacts.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 rounded-[10px] bg-shell p-3 text-[15px] leading-[22px] text-sea-ink">
                        <Icon name="check" size={18} className="mt-0.5 shrink-0 text-petrol" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="cc-support mt-2">
                    Facilities of the hotel itself. Access can carry a charge and is not part of your room rate.
                  </p>
                </>
              )}

              {props.restaurants.length > 0 && (
                <>
                  <h2 className="cc-h4 mt-7">Restaurants &amp; bars</h2>
                  <ul className="mt-3 space-y-2">
                    {props.restaurants.map((r) => (
                      <li key={r.heading} className="rounded-[12px] border border-sea-line p-4">
                        <p className="text-[16px] font-medium text-sea-ink">{r.heading}</p>
                        <p className="cc-support mt-1">{r.body}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>

        {/* Laptop: the booking decision sits beside the content, not under it. */}
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          <div className="cc-panel p-5">
            <PriceBlock
              selected={selected}
              basis={basis}
              bandLabel={props.bandLabel}
              ratesNotice={props.ratesNotice}
            />
            <ActionButton canBook={canBook} href={requestHref} selected={Boolean(selected)} />
            <p className="cc-support mt-3">
              A request, not a booking. No card is taken here and nothing is held until a specialist confirms it with{' '}
              {hotelName}.
            </p>
            <a href="tel:+97144206965" className="cc-btn-quiet mt-3 w-full">
              <Icon name="phone" size={18} />
              +971 4 420 6965
            </a>
          </div>
        </aside>
      </div>

      {/* Phone: the sticky bar owns the bottom of the window. */}
      <div className="h-[92px] lg:hidden" aria-hidden="true" />
      <div className="cc-safe fixed inset-x-0 bottom-0 z-40 border-t border-sea-line bg-white/97 backdrop-blur lg:hidden">
        <div className="cc-wrap flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <PriceBlock
              selected={selected}
              basis={basis}
              bandLabel={props.bandLabel}
              ratesNotice={props.ratesNotice}
              compact
            />
          </div>
          <ActionButton canBook={canBook} href={requestHref} selected={Boolean(selected)} compact />
        </div>
      </div>
    </>
  );
}

function PriceBlock({
  selected,
  basis,
  bandLabel,
  ratesNotice,
  compact = false,
}: {
  selected: PublicRoomOffer | null;
  basis: string;
  bandLabel: string | null;
  ratesNotice: string | null;
  compact?: boolean;
}) {
  if (selected) {
    return (
      <div>
        <p className={compact ? 'cc-price' : 'font-display text-[30px] font-semibold leading-[36px] text-sea-ink'}>
          {selected.currency} {money(selected.total)} <span className="text-[15px] font-normal text-sea-soft">total</span>
        </p>
        <p className="cc-support truncate">{basis}</p>
      </div>
    );
  }
  return (
    <div>
      <p className={compact ? 'text-[15px] font-medium text-sea-ink' : 'cc-h4'}>
        {bandLabel ? `${bandLabel} a night` : 'Price on request'}
      </p>
      <p className="cc-support truncate">{ratesNotice ? 'Guide price' : 'Add dates for a total'}</p>
    </div>
  );
}

function ActionButton({
  canBook,
  href,
  selected,
  compact = false,
}: {
  canBook: boolean;
  href: string;
  selected: boolean;
  compact?: boolean;
}) {
  const label = canBook && selected ? 'Check availability' : 'Ask about this stay';
  const to = canBook && selected ? href : '#ask';
  return (
    <Link href={to} className={`cc-btn-primary ${compact ? 'shrink-0 !px-5' : 'mt-4 w-full'}`}>
      {label}
      <Icon name="chevron-right" size={18} />
    </Link>
  );
}
