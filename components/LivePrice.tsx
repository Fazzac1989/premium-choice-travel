'use client';

import { useState, useTransition } from 'react';
import { checkRate } from '@/lib/rates/actions';
import type { DisplayRate } from '@/lib/rates/types';

/**
 * An indicative price for chosen dates — shown on request, never on load.
 *
 * Deliberately not a booking step. Premium Choice quotes personally, so this
 * answers "roughly what am I looking at?" and hands straight to the enquiry
 * form. There is no basket and no confirm button anywhere in this component.
 *
 * The click-to-price behaviour also protects the supplier relationship: bed
 * banks measure searches against bookings, and pricing every visitor who ever
 * opens the page would wreck that ratio for no gain.
 */
export default function LivePrice({
  hotelId,
  checkIn,
  nights,
  adults = 2,
  dateLabel,
}: {
  hotelId: number;
  checkIn: string;
  nights: number;
  adults?: number;
  /** "Fri 28 – Sun 30 Aug", when the visitor picked a weekend. */
  dateLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [rate, setRate] = useState<DisplayRate | null>(null);

  if (!checkIn) return null;

  const ask = () =>
    startTransition(async () => {
      setRate(await checkRate({ hotelId, checkIn, nights, adults }));
    });

  if (!rate) {
    return (
      <button
        type="button"
        onClick={ask}
        disabled={pending}
        className="w-full rounded-lg border border-teal/40 bg-teal/10 px-3 py-2.5 text-sm font-semibold text-teal transition-colors hover:bg-teal/20 disabled:opacity-60"
      >
        {pending ? 'Checking…' : `Show an indicative price${dateLabel ? ` for ${dateLabel}` : ''}`}
      </button>
    );
  }

  if (rate.status === 'quoted') {
    return (
      <div className="rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white/85">
        {rate.sample && (
          <p className="mb-1.5 rounded bg-amber-400/90 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
            Sample price — invented, no supplier connected
          </p>
        )}
        <p className="font-semibold text-teal">
          From {rate.currency} {rate.perNight?.toLocaleString()} a night
        </p>
        <p className="mt-0.5 text-[13px]">
          {rate.currency} {rate.total?.toLocaleString()} for {rate.nights} night
          {rate.nights === 1 ? '' : 's'}
          {rate.board ? ` · ${rate.board}` : ''}
          {rate.roomName ? ` · ${rate.roomName}` : ''}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/50">
          Indicative, for two adults, and not a reservation. Send the dates below and a
          specialist confirms the real price and what is included.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white/85">
      <p className="font-semibold text-white/90">
        {rate.status === 'unavailable'
          ? 'No indicative price for those dates.'
          : 'We price this one by hand.'}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-white/50">
        Send us the dates below — it often means the best rate here is a negotiated one
        rather than a published one.
      </p>
    </div>
  );
}
