'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import BookingGate from '@/components/BookingGate';
import Icon from '@/components/staycations/coastal/Icon';
import { signOutAccount } from '@/lib/account-actions';
import { startStayBooking } from '@/lib/platform/checkout';
import { cancellationLabel, datesLabel, moneyLabel, partyLabel, type RateInfo } from '@/lib/staycations/stay-search';
import RateInfoBlock from './RateInfo';

/**
 * The checkout, one page as on the trade portal (founder, 2026-10-03): a trip bar with the total,
 * then the room, who is travelling, requests, payment and the stay's terms, and "Book and pay".
 * Everything about the room and its price comes from the quote locked on the hotel page.
 */

export type CheckoutQuote = {
  id: string;
  hotelName: string;
  city: string;
  roomName: string;
  board: string;
  checkIn: string;
  nights: number;
  adults: number;
  childAges: number[];
  refundable: boolean;
  refundDeadline: string | null;
  total: number;
  perNight: number;
  currency: string;
  expiresAt: string;
  /** the deal, inclusions, pay-at-hotel charges and the hotel's important information */
  info: RateInfo | null;
};

const EXTRAS = [
  'Early check-in',
  'Late checkout',
  'Connecting rooms',
  'Cot / baby equipment',
  'High floor',
  'Quiet room',
  'Twin beds',
  'Anniversary or birthday',
  'Accessible room',
];

export default function CheckoutScreen({
  base,
  quote,
  image,
  hotelHref,
  here,
  account,
  travellers,
  profileComplete,
}: {
  base: string;
  quote: CheckoutQuote;
  image: string | null;
  hotelHref: string;
  here: string;
  account: { email: string; fullName: string; phone: string } | null;
  travellers: { id: number; fullName: string; label: string }[];
  profileComplete: boolean;
}) {
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<number[]>(travellers[0] ? [travellers[0].id] : []);
  const [extras, setExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState(account?.phone ?? '');
  const [accepted, setAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);

  const ready = Boolean(account) && profileComplete;
  const dates = datesLabel(quote.checkIn, quote.nights);
  const party = partyLabel({ adults: quote.adults, childAges: quote.childAges });
  const held = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' }).format(
    new Date(quote.expiresAt),
  );

  const pay = () => {
    setError('');
    if (!accepted) {
      setError('Please tick the box to accept the booking terms and privacy notice.');
      return;
    }
    start(async () => {
      const named = travellers.filter((t) => chosen.includes(t.id));
      const brief = [
        named.length ? `Travelling: ${named.map((t) => t.fullName).join(', ')}` : '',
        extras.length ? `Requests: ${extras.join(', ')}` : '',
        notes.trim(),
      ]
        .filter(Boolean)
        .join('\n');
      const res = await startStayBooking({
        quoteId: quote.id,
        phone,
        notes: brief,
        travellerIds: chosen,
        acceptedTerms: accepted,
        marketingOptIn: marketing,
        backPath: here,
        base,
      });
      if (res.ok && res.payUrl) {
        setLeaving(true);
        window.location.assign(res.payUrl);
      } else setError(res.message);
    });
  };

  const card = 'cc-panel p-5';
  const heading = 'cc-h4 text-[19px]';

  return (
    <div className="pb-12">
      {/* the trip bar */}
      <div className="sticky top-14 z-20 border-b border-sea-line bg-white/95 backdrop-blur lg:top-16">
        <div className="cc-wrap flex items-center gap-3 py-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[10px] bg-petrol">
            {image && <Image src={image} alt="" fill sizes="56px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold text-sea-ink">{quote.hotelName}</p>
            <p className="truncate text-[13px] text-sea-soft">
              {quote.city} · {dates}
            </p>
            <Link href={hotelHref} className="text-[13px] font-medium text-petrol hover:underline">
              ← Back to the hotel
            </Link>
          </div>
          <div className="shrink-0 text-end">
            <p className="font-display text-[24px] font-semibold leading-[28px] text-sea-ink">{moneyLabel(quote.total, quote.currency)}</p>
            <p className="text-[12px] text-sea-soft">total, taxes in · held until {held} UAE time</p>
          </div>
        </div>
      </div>

      <div className="cc-wrap mt-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <h1 className="cc-h2">Book your stay</h1>

          <section className={card}>
            <h2 className={heading}>Your room</h2>
            <p className="mt-2 text-[16px] font-semibold text-sea-ink">{quote.roomName}</p>
            <p className="cc-body text-sea-soft">
              {quote.board} · {party} · {dates}
            </p>
            <p className={`mt-2 text-[14px] font-medium ${quote.refundable ? 'text-ok-ink' : 'text-sea-soft'}`}>
              {cancellationLabel(quote)}
            </p>
            <RateInfoBlock info={quote.info} className="mt-3" />
          </section>

          <section className={card}>
            <h2 className={heading}>Who is travelling</h2>
            {!ready ? (
              <div className="mt-3">
                <BookingGate account={account} here={here} />
              </div>
            ) : (
              <>
                {travellers.length > 0 && (
                  <>
                    <p className="cc-support mt-2">Choose who is staying; we use the passport spellings you saved.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {travellers.map((t) => {
                        const on = chosen.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setChosen((c) => (on ? c.filter((v) => v !== t.id) : [...c, t.id]))}
                            className={`cc-chip !min-h-[40px] !rounded-full !px-4 text-[14px] ${on ? 'cc-chip-on' : ''}`}
                          >
                            {t.label || t.fullName}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                <p className="cc-support mt-3">
                  Booking as <strong className="text-sea-ink">{account?.fullName || account?.email}</strong> ({account?.email}) ·{' '}
                  <Link href="/account/travellers" className="font-semibold text-petrol">
                    Manage travellers
                  </Link>
                </p>
                <form action={signOutAccount} className="mt-1">
                  <input type="hidden" name="next" value={here} />
                  <button type="submit" className="text-[13px] font-semibold text-sea-soft underline underline-offset-2">
                    Not you? Sign out
                  </button>
                </form>
                <label className="mt-4 block">
                  <span className="cc-label">Mobile or WhatsApp, for the hotel and for us</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="cc-field mt-1" inputMode="tel" autoComplete="tel" />
                </label>
              </>
            )}
          </section>

          {ready && (
            <>
              <section className={card}>
                <h2 className={heading}>Special requests</h2>
                <p className="cc-support mt-1">Requests, not guarantees: the hotel confirms these on arrival.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXTRAS.map((x) => {
                    const on = extras.includes(x);
                    return (
                      <button
                        key={x}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setExtras((e) => (on ? e.filter((v) => v !== x) : [...e, x]))}
                        className={`cc-chip !min-h-[38px] !rounded-full !px-3 text-[14px] ${on ? 'cc-chip-on' : ''}`}
                      >
                        {x}
                      </button>
                    );
                  })}
                </div>
                <label className="mt-3 block">
                  <span className="sr-only">Anything else</span>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything else the hotel should know…"
                    className="cc-field mt-1 py-3"
                  />
                </label>
              </section>

              <section className={card}>
                <h2 className={`${heading} flex items-center gap-2`}>
                  <Icon name="check" size={18} />
                  Secure payment
                </h2>
                <p className="cc-body mt-2 text-sea-soft">
                  You pay by card on our payment provider’s secure page; your card details never reach us. The amount is
                  held first, {quote.hotelName} is booked, and only then is it charged. If the room cannot be booked, the
                  hold is released and nothing is charged.
                </p>
              </section>

              <section className={card}>
                <h2 className={heading}>About this stay</h2>
                <dl className="mt-3 grid gap-4 text-[14px] sm:grid-cols-3">
                  <div>
                    <dt className="cc-label">Cancellation</dt>
                    <dd className="text-sea-ink">
                      {cancellationLabel(quote)}. Cancel online from My trips while the terms allow.
                    </dd>
                  </div>
                  <div>
                    <dt className="cc-label">Paid now</dt>
                    <dd className="text-sea-ink">{moneyLabel(quote.total, quote.currency)}, the whole stay with taxes.</dd>
                  </div>
                  <div>
                    <dt className="cc-label">Paid at the hotel</dt>
                    <dd className="text-sea-ink">The tourism dirham fee and any security deposit.</dd>
                  </div>
                </dl>
                <div className="mt-4 space-y-3 border-t border-sea-line pt-4">
                  <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-[20px] text-sea-ink">
                    <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-petrol" />
                    <span>
                      I accept the{' '}
                      <Link href="/terms" target="_blank" className="font-semibold text-petrol underline underline-offset-2">
                        booking terms
                      </Link>{' '}
                      and the{' '}
                      <Link href="/privacy" target="_blank" className="font-semibold text-petrol underline underline-offset-2">
                        privacy notice
                      </Link>
                      .
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-[20px] text-sea-soft">
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-petrol" />
                    <span>Email me Premium Choice offers now and then. Optional, and you can stop at any time.</span>
                  </label>
                </div>
              </section>

              <section className={card}>
                {error && (
                  <p role="alert" className="mb-3 rounded-[10px] bg-err-bg px-3 py-2 text-[14px] text-err-ink">
                    {error}
                  </p>
                )}
                <button type="button" onClick={pay} disabled={pending || leaving} className="cc-btn-primary w-full !min-h-[52px] !rounded-full text-[16px]">
                  {leaving ? 'Opening the payment page…' : pending ? 'Checking the price…' : `Book and pay — ${moneyLabel(quote.total, quote.currency)}`}
                </button>
                <p className="cc-support mt-3 text-center">
                  The price is held until {held} UAE time; after that we check it with the hotel again before you pay.
                </p>
              </section>
            </>
          )}

          <p className="cc-support text-center">
            Questions before you book? Call a specialist in Dubai on{' '}
            <a href="tel:+97144206965" className="font-semibold text-petrol">
              +971 4 420 6965
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
