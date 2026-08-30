'use client';

import { useState, useTransition } from 'react';
import { roomOffers, submitBookingRequest } from '@/lib/rates/actions';
import type { PublicRoomOffer } from '@/lib/rates/types';

const CHANNELS = ['WhatsApp', 'Email', 'Phone'];

/**
 * Choose dates, see rooms, ask to book — in three steps on one panel.
 *
 * The last step is a request, not a booking. No card is taken and nothing is
 * held, and the wording says so at every stage rather than in a footnote,
 * because a customer who thinks they have booked a room and turns up to find
 * they have not is the worst outcome this page could produce.
 */
export default function BookingFlow({
  hotelId,
  hotelName,
  defaultCheckIn = '',
  defaultNights = 2,
}: {
  hotelId: number;
  hotelName: string;
  defaultCheckIn?: string;
  defaultNights?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<'dates' | 'rooms' | 'details' | 'done'>('dates');
  const [error, setError] = useState('');
  const [offers, setOffers] = useState<PublicRoomOffer[]>([]);
  const [chosen, setChosen] = useState<PublicRoomOffer | null>(null);
  const [done, setDone] = useState('');

  const [search, setSearch] = useState({
    checkIn: defaultCheckIn,
    nights: defaultNights,
    adults: 2,
    children: 0,
  });
  const [guest, setGuest] = useState({
    name: '',
    email: '',
    phone: '',
    channel: 'WhatsApp',
    notes: '',
  });

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const perNight = (o: PublicRoomOffer) => Math.round(o.total / Math.max(1, search.nights));

  const findRooms = () => {
    setError('');
    startTransition(async () => {
      const res = await roomOffers({ hotelId, ...search });
      if (!res.ok) {
        setError(res.message ?? 'Nothing available for those dates.');
        return;
      }
      setOffers(res.offers);
      setStep('rooms');
    });
  };

  const send = () => {
    setError('');
    if (!chosen) return;
    startTransition(async () => {
      const res = await submitBookingRequest({
        hotelId,
        checkIn: search.checkIn,
        nights: search.nights,
        adults: search.adults,
        children: search.children,
        offerId: chosen.offerId,
        ...guest,
      });
      if (res.ok) {
        setDone(res.message);
        setStep('done');
      } else {
        setError(res.message);
      }
    });
  };

  const field =
    'mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40';
  const label = 'text-[11px] font-bold uppercase tracking-wider text-white/60';

  if (step === 'done') {
    return (
      <div className="rounded-2xl bg-teal/10 p-6 text-center">
        <p className="font-serif text-xl text-teal-deep">Request sent ✓</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{done}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 1 — dates and party */}
      {step === 'dates' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Check-in</label>
              <input
                type="date"
                required
                min={minDate}
                value={search.checkIn}
                onChange={(e) => setSearch({ ...search, checkIn: e.target.value })}
                className={`${field} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label className={label}>Nights</label>
              <select
                value={search.nights}
                onChange={(e) => setSearch({ ...search, nights: Number(e.target.value) })}
                className={field}
              >
                {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
                  <option key={n} value={n} className="text-ink">{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Adults</label>
              <select
                value={search.adults}
                onChange={(e) => setSearch({ ...search, adults: Number(e.target.value) })}
                className={field}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n} className="text-ink">{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Children</label>
              <select
                value={search.children}
                onChange={(e) => setSearch({ ...search, children: Number(e.target.value) })}
                className={field}
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n} className="text-ink">{n}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="button"
            onClick={findRooms}
            disabled={pending || !search.checkIn}
            className="btn-primary w-full disabled:opacity-60"
          >
            {pending ? 'Looking…' : 'See rooms and prices'}
          </button>
        </>
      )}

      {/* 2 — the rooms that came back */}
      {step === 'rooms' && (
        <>
          <div className="flex items-baseline justify-between">
            <p className={label}>{offers.length} option{offers.length === 1 ? '' : 's'}</p>
            <button type="button" onClick={() => setStep('dates')} className="text-xs font-semibold text-teal hover:underline">
              Change dates
            </button>
          </div>
          <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
            {offers.map((o) => (
              <button
                key={o.offerId}
                type="button"
                onClick={() => {
                  setChosen(o);
                  setStep('details');
                }}
                className="w-full rounded-lg border border-white/20 bg-white/5 p-3 text-left transition-colors hover:border-teal"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{o.roomName}</p>
                  <p className="shrink-0 text-sm font-bold text-teal">
                    {o.currency} {money(o.total)}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] text-white/60">
                  {o.board || 'Room only'} ·{' '}
                  {o.refundable === true ? 'Free cancellation' : o.refundable === false ? 'Non-refundable' : 'Cancellation on request'}
                  {' · '}
                  {o.currency} {money(perNight(o))} a night
                </p>
                {o.extraFees.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-amber-200/80">
                    Plus {o.extraFees.map((f) => `${f.currency} ${f.amount} ${f.description}`).join(', ')} at the hotel
                  </p>
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-white/50">
            Prices are for {search.adults} adult{search.adults === 1 ? '' : 's'}
            {search.children ? ` and ${search.children} child${search.children === 1 ? '' : 'ren'}` : ''}, for the whole
            stay. They can move until a specialist confirms them.
          </p>
        </>
      )}

      {/* 3 — who we are asking for */}
      {step === 'details' && chosen && (
        <>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{chosen.roomName}</p>
                <p className="mt-0.5 text-[11px] text-white/60">
                  {search.checkIn} · {search.nights} night{search.nights === 1 ? '' : 's'} ·{' '}
                  {chosen.board || 'Room only'}
                </p>
              </div>
              <p className="shrink-0 text-sm font-bold text-teal">
                {chosen.currency} {money(chosen.total)}
              </p>
            </div>
            <button type="button" onClick={() => setStep('rooms')} className="mt-2 text-xs font-semibold text-teal hover:underline">
              Choose a different room
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              required
              value={guest.name}
              onChange={(e) => setGuest({ ...guest, name: e.target.value })}
              placeholder="Your name *"
              className={field}
            />
            <input
              required
              type="email"
              value={guest.email}
              onChange={(e) => setGuest({ ...guest, email: e.target.value })}
              placeholder="Email *"
              className={field}
            />
          </div>
          <input
            value={guest.phone}
            onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
            placeholder="Mobile / WhatsApp"
            className={field}
          />
          <div>
            <label className={label}>How should we reply?</label>
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
            rows={2}
            placeholder="Anything else — occasion, bed setup, late checkout…"
            className={field}
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button type="button" onClick={send} disabled={pending} className="btn-primary w-full disabled:opacity-60">
            {pending ? 'Sending…' : `Request this room — ${chosen.currency} ${money(chosen.total)}`}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-white/60">
            This sends a request, not a booking. No payment is taken here and nothing is held
            until a specialist confirms the room and the final price with {hotelName}.
          </p>
        </>
      )}
    </div>
  );
}
