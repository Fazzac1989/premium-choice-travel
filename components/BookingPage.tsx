'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import BookingGate from '@/components/BookingGate';
import BrandLoader from '@/components/BrandLoader';
import { roomOffers, submitBookingRequest } from '@/lib/rates/actions';
import type { PublicRoomOffer } from '@/lib/rates/types';

const CHANNELS = ['WhatsApp', 'Email', 'Phone'];

/** Extras a specialist can genuinely ask a UAE hotel for. Nothing promised. */
const EXTRAS = [
  'Early check-in',
  'Late checkout',
  'Connecting rooms',
  'Cot / baby equipment',
  'High floor',
  'Quiet room',
  'Twin beds',
  'Airport transfer',
  'Anniversary or birthday',
  'Accessible room',
];

/**
 * The booking request, on its own page.
 *
 * Rooms load on arrival — the visitor already asked for prices by opening this
 * page, so making them ask twice would be silly. Everything after that is one
 * scroll: choose a room, say what you want, say who you are.
 *
 * It ends in a request. No card, nothing held, and the page says so more than
 * once, because the cost of someone misreading this is a family arriving at a
 * hotel that is not expecting them.
 */
export default function BookingPage({
  hotelId,
  hotelName,
  emirate,
  logo,
  hotelHref,
  checkIn,
  nights,
  adults,
  children,
  childrenAges = [],
  preselectOfferId = '',
  account,
  travellers,
  profileComplete,
  here,
}: {
  hotelId: number;
  hotelName: string;
  emirate: string;
  logo: string | null;
  hotelHref: string;
  checkIn: string;
  nights: number;
  adults: number;
  children: number;
  /** Real ages when the visitor gave them — hotels price children by age. */
  childrenAges?: number[];
  /** The rate chosen on the stay page, so nobody picks a room twice. */
  preselectOfferId?: string;
  /** Set when they are signed in — their details fill the form. */
  account: { email: string; fullName: string; phone: string } | null;
  /** Saved travellers, so names are chosen rather than retyped. */
  travellers: { id: number; fullName: string; label: string }[];
  /** Their name and date of birth are on file, so nothing more is needed. */
  profileComplete: boolean;
  /** This page's own URL — where a sign-in link brings them back to. */
  here: string;
}) {
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [offers, setOffers] = useState<PublicRoomOffer[]>([]);
  const [problem, setProblem] = useState('');
  const [chosen, setChosen] = useState<PublicRoomOffer | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  // Which rooms have their small print open. Several may be, so a customer
  // can compare two rates' conditions side by side.
  const [expanded, setExpanded] = useState<string[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [guest, setGuest] = useState({
    name: account?.fullName ?? '',
    email: account?.email ?? '',
    phone: account?.phone ?? '',
    channel: 'WhatsApp',
    notes: '',
  });
  const [chosenTravellers, setChosenTravellers] = useState<number[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      const res = await roomOffers({ hotelId, checkIn, nights, adults, children, childrenAges });
      if (!live) return;
      if (res.ok) {
        setOffers(res.offers);
        // Carry the room chosen on the stay page; if that rate has gone, the
        // list is shown untouched rather than quietly picking another.
        const chosen = res.offers.find((o) => o.offerId === preselectOfferId);
        if (chosen) setChosen(chosen);
      } else setProblem(res.message ?? 'Nothing came back for those dates.');
      setLoaded(true);
      // Let the ring finish before the rooms replace it.
      setTimeout(() => live && setLoading(false), 450);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, checkIn, nights, adults, children, childrenAges.join(',')]);

  const agesText = childrenAges.length
    ? ` (aged ${childrenAges.length === 1 ? childrenAges[0] : `${childrenAges.slice(0, -1).join(', ')} and ${childrenAges[childrenAges.length - 1]}`})`
    : '';

  const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const perNight = (o: PublicRoomOffer) => Math.round(o.total / Math.max(1, nights));
  const stay = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const checkOut = new Date(`${checkIn}T00:00:00Z`);
  checkOut.setUTCDate(checkOut.getUTCDate() + nights);
  const dates = `${stay.format(new Date(`${checkIn}T00:00:00Z`))} – ${stay.format(checkOut)}`;

  // Signed in, and the name and date of birth a hotel checks people in
  // against are on file.
  const ready = Boolean(account) && profileComplete;

  const toggleExpanded = (id: string) =>
    setExpanded((e) => (e.includes(id) ? e.filter((v) => v !== id) : [...e, id]));

  const toggleExtra = (x: string) =>
    setExtras((e) => (e.includes(x) ? e.filter((v) => v !== x) : [...e, x]));

  const send = () => {
    setError('');
    if (!chosen) {
      setError('Choose a room first.');
      return;
    }
    if (!acceptedTerms) {
      setError('Please tick the box to accept the booking terms and privacy notice.');
      return;
    }
    startTransition(async () => {
      // Names go into the brief as well as the ids, so a specialist reading
      // the email sees who is travelling without opening the account.
      const named = travellers.filter((t) => chosenTravellers.includes(t.id));
      const notes = [
        named.length ? `Travelling: ${named.map((t) => t.fullName).join(', ')}` : '',
        extras.length ? `Requests: ${extras.join(', ')}` : '',
        guest.notes.trim(),
      ]
        .filter(Boolean)
        .join('\n');
      const res = await submitBookingRequest({
        hotelId,
        checkIn,
        nights,
        adults,
        children,
        childrenAges,
        offerId: chosen.offerId,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        channel: guest.channel,
        notes,
        travellerIds: chosenTravellers,
        acceptedTerms,
        marketingOptIn,
      });
      if (res.ok) setDone(res.message);
      else setError(res.message);
    });
  };

  if (done) {
    return (
      <div className="container-site max-w-2xl py-20 text-center">
        <p className="font-serif text-4xl text-ink">Request sent</p>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">{done}</p>
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-line bg-sand p-6 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">What you asked for</p>
          <p className="mt-2 font-serif text-xl text-ink">{hotelName}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {dates} · {nights} night{nights === 1 ? '' : 's'} · {chosen?.roomName}
          </p>
          <p className="mt-1 text-sm font-semibold text-teal-deep">
            {chosen?.currency} {money(chosen?.total ?? 0)}
          </p>
        </div>
        <Link href={hotelHref} className="btn-primary mt-8 inline-block">
          Back to {hotelName}
        </Link>
      </div>
    );
  }

  const field =
    'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60';
  const label = 'text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft';

  return (
    <div className="container-site max-w-5xl py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
        <Link href={hotelHref} className="hover:text-teal-deep">
          ← {hotelName}
        </Link>
      </nav>
      <p className="eyebrow mt-4">Booking request</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">{hotelName}</h1>
      <p className="mt-3 text-ink-soft">
        {dates} · {nights} night{nights === 1 ? '' : 's'} · {adults} adult{adults === 1 ? '' : 's'}
        {children ? `, ${children} child${children === 1 ? '' : 'ren'}${agesText}` : ''}
        {emirate ? ` · ${emirate}` : ''}
      </p>

      {loading && <BrandLoader logo={logo} done={loaded} sublabel={`Asking for rooms at ${hotelName}.`} />}

      {!loading && problem && (
        <div className="mt-10 rounded-2xl border border-line p-10 text-center">
          <p className="font-serif text-2xl text-ink">{problem}</p>
          <Link href={hotelHref} className="btn-primary mt-6 inline-block">
            Change the dates
          </Link>
        </div>
      )}

      {!loading && !problem && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
          {/* Rooms */}
          <div>
            <h2 className="font-serif text-2xl text-ink">Choose a room</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Prices are for the whole stay, for {adults} adult{adults === 1 ? '' : 's'}
              {children ? ` and ${children} child${children === 1 ? '' : 'ren'}` : ''}.
            </p>
            <div className="mt-5 space-y-3">
              {offers.map((o) => {
                const active = chosen?.offerId === o.offerId;
                // Fees, promotions and the hotel's rate conditions can run to
                // several paragraphs on every room. Left open, the page is a
                // scroll to nowhere; the summary above keeps board, price and
                // cancellation in plain sight either way, and the room you
                // actually choose repeats its conditions next to the button.
                const hasSmallPrint =
                  o.extraFees.length > 0 || (o.promotions?.length ?? 0) > 0 || Boolean(o.comments);
                const openSmallPrint = expanded.includes(o.offerId);
                return (
                  <div
                    key={o.offerId}
                    className={`rounded-2xl border transition-colors ${
                      active ? 'border-teal bg-teal/5' : 'border-line hover:border-teal'
                    }`}
                  >
                  <button
                    type="button"
                    onClick={() => setChosen(o)}
                    aria-pressed={active}
                    className="w-full p-5 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-serif text-lg text-ink">{o.roomName}</p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {o.board || 'Room only'} ·{' '}
                          <span className={o.refundable === false ? 'text-ink' : 'font-semibold text-teal-deep'}>
                            {o.refundable === true
                              ? 'Free cancellation'
                              : o.refundable === false
                                ? 'Non-refundable'
                                : 'Cancellation on request'}
                          </span>
                          {o.refundable === true && o.cancelBy ? ` until ${o.cancelBy.slice(0, 10)}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-serif text-xl text-teal-deep">
                          {o.currency} {money(o.total)}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {o.currency} {money(perNight(o))} a night
                        </p>
                      </div>
                    </div>
                  </button>

                  {hasSmallPrint && (
                    <div className="border-t border-line px-5 py-3">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(o.offerId)}
                        aria-expanded={openSmallPrint}
                        className="flex w-full items-center justify-between gap-3 text-left text-xs font-semibold text-ink-soft hover:text-ink"
                      >
                        <span>
                          {openSmallPrint ? 'Hide' : 'Show'} what is included and the rate conditions
                        </span>
                        <span aria-hidden="true" className={openSmallPrint ? 'rotate-180' : ''}>
                          ⌄
                        </span>
                      </button>

                      {openSmallPrint && (
                        <div className="mt-3">
                          {o.promotions && o.promotions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {o.promotions.map((x) => (
                                <span
                                  key={x}
                                  className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal-deep"
                                >
                                  {x}
                                </span>
                              ))}
                            </div>
                          )}
                          {o.extraFees.length > 0 && (
                            <p className="mt-2 text-xs text-ink-soft">
                              Plus {o.extraFees.map((f) => `${f.currency} ${f.amount} ${f.description}`).join(', ')},
                              paid at the hotel.
                            </p>
                          )}
                          {o.comments && (
                            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
                              <span className="font-semibold text-ink">Please note: </span>
                              {o.comments}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extras and details */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl bg-ink p-7 text-white">
              <h2 className="font-serif text-xl">Your request</h2>

              {chosen ? (
                <div className="mt-3 rounded-lg bg-white/10 p-3">
                  <p className="text-sm font-semibold text-white">{chosen.roomName}</p>
                  <p className="mt-0.5 text-[11px] text-white/60">{chosen.board || 'Room only'}</p>
                  <p className="mt-1 font-serif text-xl text-teal">
                    {chosen.currency} {money(chosen.total)}
                  </p>
                  {chosen.comments && (
                    <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-white/70">
                      <span className="font-semibold text-white">Before you send — </span>
                      {chosen.comments}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-white/10 p-3 text-sm text-white/70">
                  Pick a room on the left and it appears here.
                </p>
              )}

              <div className="mt-5">
                <label className={`${label} !text-white/60`}>Anything you’d like us to ask for</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EXTRAS.map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => toggleExtra(x)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        extras.includes(x)
                          ? 'border-teal bg-teal text-white'
                          : 'border-white/20 bg-white/10 text-white/80 hover:border-teal'
                      }`}
                    >
                      {x}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/50">
                  Requests, not guarantees — the hotel confirms these on arrival.
                </p>
              </div>

              {/* A booking belongs to someone. Until we know who, and have the
                  name a hotel will check them in against, the form below is
                  not the right question to ask. */}
              {!ready ? (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <BookingGate account={account} needsDetails={Boolean(account)} here={here} />
                </div>
              ) : (
                <>
              {account && (
                travellers.length > 0 && (
                  <div className="mt-5">
                    <label className={`${label} !text-white/60`}>Who is travelling?</label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {travellers.map((t) => {
                        const on = chosenTravellers.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              setChosenTravellers((c) =>
                                on ? c.filter((v) => v !== t.id) : [...c, t.id],
                              )
                            }
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                              on
                                ? 'border-teal bg-teal text-white'
                                : 'border-white/20 bg-white/10 text-white/80 hover:border-teal'
                            }`}
                          >
                            {t.label || t.fullName}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/50">
                      We use the passport spellings you have saved.{' '}
                      <Link href="/account/travellers" className="font-semibold text-teal hover:underline">
                        Manage travellers
                      </Link>
                    </p>
                  </div>
                )
              )}

              <div className="mt-5 space-y-3">
                <div className="rounded-lg bg-white/10 px-3 py-2.5">
                  <p className="text-sm text-white">
                    Booking as <strong>{guest.name || account?.fullName}</strong>
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    {guest.email} ·{' '}
                    <Link href="/account/travellers" className="font-semibold text-teal hover:underline">
                      edit your details
                    </Link>
                  </p>
                </div>
                <input
                  value={guest.phone}
                  onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                  placeholder="Mobile / WhatsApp"
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
                <div>
                  <label className={`${label} !text-white/60`}>How should we reply?</label>
                  <div className="mt-1.5 flex gap-2">
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setGuest({ ...guest, channel: ch })}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                          guest.channel === ch
                            ? 'border-teal bg-teal text-white'
                            : 'border-white/20 bg-white/10 text-white/80 hover:border-teal'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={guest.notes}
                  onChange={(e) => setGuest({ ...guest, notes: e.target.value })}
                  rows={3}
                  placeholder="Anything else we should know…"
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
              </div>

              <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-white/85">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-teal"
                  />
                  <span>
                    I accept the{' '}
                    <Link href="/terms" target="_blank" className="font-semibold text-white underline underline-offset-2">
                      booking terms
                    </Link>{' '}
                    and the{' '}
                    <Link href="/privacy" target="_blank" className="font-semibold text-white underline underline-offset-2">
                      privacy notice
                    </Link>
                    . *
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-white/70">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-teal"
                  />
                  <span>
                    Email me Premium Choice offers now and then. Optional, and you can stop at any time.
                  </span>
                </label>
              </div>

              {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

              <button
                type="button"
                onClick={send}
                disabled={pending || !chosen || !acceptedTerms}
                className="btn-primary mt-4 w-full disabled:opacity-50"
              >
                {pending
                  ? 'Sending…'
                  : !chosen
                    ? 'Choose a room to continue'
                    : !acceptedTerms
                      ? 'Accept the terms to continue'
                      : `Send request — ${chosen.currency} ${money(chosen.total)}`}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/60">
                This is a request, not a booking. No payment is taken here and no room is held
                until a specialist confirms it with {hotelName}.
              </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
