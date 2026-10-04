'use client';

import { useId, useState } from 'react';
import EnquiryForm from '@/components/EnquiryForm';
import type { HolidayRoom } from '@/lib/holidays/holiday-search';
import { DEPOSIT_SCHEDULE, depositAmount, depositFor } from '@/lib/holidays/deposit';

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
  departDate,
}: {
  rooms: HolidayRoom[];
  travellers: number;
  nights: number;
  hotelName: string;
  /** e.g. "4 nights · 15–19 Nov 2026 · 2 adults · from Dubai (DXB)" */
  tripLabel: string;
  flightPending: boolean;
  brand: string;
  /** The day they fly, which decides the deposit. */
  departDate: string;
}) {
  const name = useId();
  const [chosen, setChosen] = useState(rooms[0]?.offerId ?? '');
  const [showAll, setShowAll] = useState(false);
  const room = rooms.find((r) => r.offerId === chosen) ?? rooms[0];
  const band = depositFor(departDate);

  // A supplier returns every rate combination it holds — one Dubai hotel came
  // back with 137, which is not a choice, it is a wall. What a customer is
  // actually choosing between is the room, the board and whether they can
  // cancel, so keep the cheapest rate for each of those and drop the rest.
  // `rooms` arrives cheapest first, so the first of each kind is the one to keep.
  const groups = new Map<string, HolidayRoom[]>();
  const seen = new Set<string>();
  for (const r of rooms) {
    const kind = `${r.roomName.toLowerCase()}|${r.board}|${r.refundable}`;
    if (seen.has(kind)) continue;
    seen.add(kind);
    const key = r.roomName.toLowerCase().replace(/\s+/g, ' ').trim();
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const all = Array.from(groups.entries());
  const shown = showAll ? all : all.slice(0, 8);

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
          {shown.map(([key, list]) => (
            <li key={key} className="overflow-hidden rounded-xl border border-line bg-white">
              <h3 className="border-b border-line bg-sand/50 px-4 py-3 font-semibold text-ink">
                {list[0].roomName}
              </h3>
              <ul>
                {list.map((r) => {
                  const selected = r.offerId === chosen;
                  const perPerson = Math.round(r.total / Math.max(1, travellers));
                  return (
                    <li key={r.offerId} className="border-b border-line last:border-b-0">
                      <label
                        className={`flex cursor-pointer flex-col gap-3 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                          selected ? 'bg-teal/5' : 'hover:bg-sand/40'
                        }`}
                      >
                        <span className="flex min-w-0 items-start gap-3">
                          <input
                            type="radio"
                            name={name}
                            value={r.offerId}
                            checked={selected}
                            onChange={() => setChosen(r.offerId)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-teal-deep"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink">{r.board}</span>
                            <span className="mt-0.5 block text-xs text-ink-soft">
                              {r.refundable
                                ? r.refundDeadline
                                  ? `Free cancellation until ${new Date(r.refundDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                  : 'Free cancellation available'
                                : 'Non-refundable rate'}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 pl-7 sm:pl-0 sm:text-right">
                          <span className="block font-serif text-xl text-ink">{aed.format(perPerson)}</span>
                          <span className="block text-xs text-ink-soft">
                            per person &middot; {aed.format(r.total)} total
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>

        {all.length > 8 ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="mt-4 text-sm font-semibold text-teal-deep underline-offset-4 hover:underline"
          >
            {showAll ? 'Show fewer room types' : `Show all ${all.length} room types`}
          </button>
        ) : null}
      </section>

      {room ? (
        <section
          aria-labelledby="deposit-heading"
          className="mt-6 rounded-2xl border border-cloud-line bg-sun-wash p-5"
        >
          <h2 id="deposit-heading" className="text-lg font-extrabold text-slate">
            {band.percent < 100
              ? `Book this for ${aed.format(depositAmount(room.total, band))} today`
              : 'This holiday is paid in full'}
          </h2>
          <p className="mt-1 text-sm text-slate-soft">
            {band.because}
            {band.percent < 100
              ? ` The balance of ${aed.format(room.total - depositAmount(room.total, band))} is due before you travel.`
              : ''}
          </p>
          <dl className="mt-3 grid gap-1 text-xs text-slate-soft sm:grid-cols-3">
            {DEPOSIT_SCHEDULE.map((row) => (
              <div key={row.when} className="flex gap-1.5">
                <dt>{row.when}:</dt>
                <dd className="font-bold text-slate">{row.pay}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

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
