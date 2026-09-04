'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
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
  account,
  travellers,
  signInHref,
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
  /** Set when they are signed in — their details fill the form. */
  account: { email: string; fullName: string; phone: string } | null;
  /** Saved travellers, so names are chosen rather than retyped. */
  travellers: { id: number; fullName: string; label: string }[];
  signInHref: string;
}) {
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [offers, setOffers] = useState<PublicRoomOffer[]>([]);
  const [problem, setProblem] = useState('');
  const [chosen, setChosen] = useState<PublicRoomOffer | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
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
      if (res.ok) setOffers(res.offers);
      else setProblem(res.message ?? 'Nothing came back for those dates.');
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

  const toggleExtra = (x: string) =>
    setExtras((e) => (e.includes(x) ? e.filter((v) => v !== x) : [...e, x]));

  const send = () => {
    setError('');
    if (!chosen) {
      setError('Choose a room first.');
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
                return (
                  <button
                    key={o.offerId}
                    type="button"
                    onClick={() => setChosen(o)}
                    className={`w-full rounded-2xl border p-5 text-left transition-colors ${
                      active ? 'border-teal bg-teal/5' : 'border-line hover:border-teal'
                    }`}
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
                        {o.extraFees.length > 0 && (
                          <p className="mt-1 text-xs text-ink-soft">
                            Plus {o.extraFees.map((f) => `${f.currency} ${f.amount} ${f.description}`).join(', ')},
                            paid at the hotel
                          </p>
                        )}
                        {o.promotions && o.promotions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {o.promotions.map((p) => (
                              <span key={p} className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-semibold text-teal-deep">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                        {o.comments && (
                          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
                            <span className="font-semibold text-ink">Please note: </span>
                            {o.comments}
                          </p>
                        )}
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

              {/* Signed in: choose from saved travellers. Signed out: an offer,
                  never a gate — sending someone to their inbox at the moment
                  they want to book loses the booking. */}
              {account ? (
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
              ) : (
                <div className="mt-5 rounded-lg bg-white/10 p-3">
                  <p className="text-sm text-white/85">
                    <Link href={signInHref} className="font-semibold text-teal hover:underline">
                      Sign in
                    </Link>{' '}
                    and we will fill this in — and use the passport spellings you have saved.
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                    Not required. Carry on below and everything will be waiting in your account
                    the first time you do sign in.
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    value={guest.name}
                    onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                    placeholder="Your name *"
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
                  <input
                    required
                    type="email"
                    value={guest.email}
                    onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                    placeholder="Email *"
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  />
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

              {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

              <button
                type="button"
                onClick={send}
                disabled={pending || !chosen}
                className="btn-primary mt-4 w-full disabled:opacity-50"
              >
                {pending
                  ? 'Sending…'
                  : chosen
                    ? `Send request — ${chosen.currency} ${money(chosen.total)}`
                    : 'Choose a room to continue'}
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-white/60">
                This is a request, not a booking. No payment is taken here and no room is held
                until a specialist confirms it with {hotelName}.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
