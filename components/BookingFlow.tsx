'use client';

import { useState } from 'react';

/**
 * The dates panel on a hotel page.
 *
 * Its only job is to collect dates and party, then hand off to the booking
 * page in a new tab. Pricing lives there rather than in this narrow column:
 * a dozen room options with board and cancellation terms need room to be read,
 * and a new tab means the hotel page they were reading is still behind them.
 */
export default function BookingFlow({
  hotelName,
  bookHref,
  defaultCheckIn = '',
  defaultNights = 2,
}: {
  hotelName: string;
  /** Path of this hotel's booking page, without the query. */
  bookHref: string;
  defaultCheckIn?: string;
  defaultNights?: number;
}) {
  const [form, setForm] = useState({
    checkIn: defaultCheckIn,
    nights: defaultNights,
    adults: 2,
    children: 0,
  });

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const href = `${bookHref}?from=${form.checkIn}&nights=${form.nights}&adults=${form.adults}&children=${form.children}`;

  const field =
    'mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40';
  const label = 'text-[11px] font-bold uppercase tracking-wider text-white/60';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Check-in</label>
          <input
            type="date"
            required
            min={minDate}
            value={form.checkIn}
            onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
            className={`${field} [color-scheme:dark]`}
          />
        </div>
        <div>
          <label className={label}>Nights</label>
          <select
            value={form.nights}
            onChange={(e) => setForm({ ...form, nights: Number(e.target.value) })}
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
            value={form.adults}
            onChange={(e) => setForm({ ...form, adults: Number(e.target.value) })}
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
            value={form.children}
            onChange={(e) => setForm({ ...form, children: Number(e.target.value) })}
            className={field}
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n} className="text-ink">{n}</option>
            ))}
          </select>
        </div>
      </div>

      {form.checkIn ? (
        <a href={href} target="_blank" rel="noopener" className="btn-primary block w-full text-center">
          Show me prices ↗
        </a>
      ) : (
        <button type="button" disabled className="btn-primary w-full opacity-60">
          Pick a check-in date
        </button>
      )}

      <p className="text-center text-xs leading-relaxed text-white/60">
        Opens in a new tab. You’ll see the rooms available and can send a request —
        no payment, and nothing is held until we confirm it with {hotelName}.
      </p>
    </div>
  );
}
