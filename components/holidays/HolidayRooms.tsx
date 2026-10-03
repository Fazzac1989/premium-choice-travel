'use client';

import { useId, useState } from 'react';
import EnquiryForm from '@/components/EnquiryForm';
import type { HolidayRoom } from '@/lib/holidays/holiday-search';

/**
 * Choosing a room, and saying what you want.
 *
 * The flight cannot be priced yet, so this does not pretend to be a checkout.
 * It gets the customer to the one thing that does work: naming the room they
 * want, on the dates they want, to somebody who can price the rest. What they
 * picked travels with the enquiry so nobody has to ask them twice.
 */

const aed = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
});

export default function HolidayRooms({
  rooms,
  travellers,
  nights,
  hotelName,
  tripLabel,
  flightPending,
  brand,
}: {
  rooms: HolidayRoom[];
  travellers: number;
  nights: number;
  hotelName: string;
  /** e.g. "4 nights · 15–19 Nov 2026 · 2 adults · from Dubai (DXB)" */
  tripLabel: string;
  flightPending: boolean;
  brand: string;
}) {
  const name = useId();
  const [chosen, setChosen] = useState(rooms[0]?.offerId ?? '');
  const room = rooms.find((r) => r.offerId === chosen) ?? rooms[0];

  const enquiryTitle = room
    ? `${hotelName} — ${room.roomName}, ${room.board} — ${tripLabel}`
    : `${hotelName} — ${tripLabel}`;

  return (
    <>
      <section aria-labelledby="rooms-heading">
        <h2 id="rooms-heading" className="font-serif text-2xl text-ink">
          Choose your room
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {nights} nights for {travellers} {travellers === 1 ? 'traveller' : 'travellers'}.{' '}
          {flightPending ? 'Prices are for the hotel only.' : 'Prices include flights.'}
        </p>

        <ul className="mt-4 grid gap-3">
          {rooms.map((r) => {
            const selected = r.offerId === chosen;
            const perPerson = Math.round(r.total / Math.max(1, travellers));
            return (
              <li key={r.offerId}>
                <label
                  className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    selected ? 'border-teal-deep bg-teal/5' : 'border-line bg-white hover:border-teal-deep'
                  }`}
                >
                  <span className="flex min-w-0 items-start gap-3">
                    <input
                      type="radio"
                      name={name}
                      value={r.offerId}
                      checked={selected}
                      onChange={() => setChosen(r.offerId)}
                      className="mt-1 h-4 w-4 shrink-0 accent-teal-deep"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{r.roomName}</span>
                      <span className="block text-sm text-ink-soft">{r.board}</span>
                      <span className="mt-1 block text-xs text-ink-soft">
                        {r.refundable
                          ? r.refundDeadline
                            ? `Free cancellation until ${new Date(r.refundDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                            : 'Free cancellation available'
                          : 'Non-refundable rate'}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 sm:text-right">
                    <span className="block font-serif text-2xl text-ink">{aed.format(perPerson)}</span>
                    <span className="block text-xs text-ink-soft">
                      per person &middot; {aed.format(r.total)} total
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="enquire-heading" className="mt-10 border-t border-line pt-8">
        <h2 id="enquire-heading" className="font-serif text-2xl text-ink">
          {flightPending ? 'Add flights and confirm' : 'Confirm this holiday'}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-ink-soft">
          {flightPending
            ? 'Send this to us and a specialist will come back with the flights priced alongside the room you picked, usually the same working day.'
            : 'Send this to us and a specialist will confirm availability and hold it for you.'}
        </p>
        <div className="mt-3 rounded-xl border border-line bg-sand/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Your enquiry</p>
          <p className="mt-1 text-sm text-ink">{enquiryTitle}</p>
        </div>
        <div className="mt-5 max-w-xl">
          <EnquiryForm brand={brand} packageTitle={enquiryTitle} />
        </div>
      </section>
    </>
  );
}
