'use client';

import { useState, useTransition } from 'react';
import { submitAvailabilityCheck } from '@/lib/availability-actions';

const MEAL_PLANS = ['No preference', 'Room only', 'Bed & breakfast', 'Half board', 'Full board', 'All-inclusive'];

/**
 * Dates/party/meal-plan availability check for a staycation hotel.
 * Bed-bank-ready: the same fields become the live availability request later.
 */
export default function AvailabilityCheck({
  hotelName,
  emirate = '',
  mealPlans = [],
}: {
  hotelName: string;
  emirate?: string;
  mealPlans?: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    checkIn: '',
    nights: 2,
    adults: 2,
    childrenAges: '',
    mealPlan: 'No preference',
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const planOptions = ['No preference', ...(mealPlans.length ? mealPlans : MEAL_PLANS.slice(1))];

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  if (done) {
    return (
      <div className="rounded-2xl bg-teal/10 p-6 text-center">
        <p className="font-serif text-xl text-teal-deep">Request received ✓</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{done}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError('');
        startTransition(async () => {
          const res = await submitAvailabilityCheck({ ...form, hotelName, emirate });
          if (res.ok) setDone(res.message);
          else setError(res.message);
        });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Check-in</label>
          <input
            type="date"
            required
            min={minDate}
            value={form.checkIn}
            onChange={(e) => set('checkIn', e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Nights</label>
          <select
            value={form.nights}
            onChange={(e) => set('nights', Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
          >
            {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
              <option key={n} value={n} className="text-ink">{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Adults</label>
          <select
            value={form.adults}
            onChange={(e) => set('adults', Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n} className="text-ink">{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Children’s ages</label>
          <input
            value={form.childrenAges}
            onChange={(e) => set('childrenAges', e.target.value)}
            placeholder="e.g. 4 and 9"
            className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-white/60">Meal plan</label>
        <select
          value={form.mealPlan}
          onChange={(e) => set('mealPlan', e.target.value)}
          className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
        >
          {planOptions.map((m) => (
            <option key={m} value={m} className="text-ink">{m}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Your name *"
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="Email *"
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
        />
      </div>
      <input
        value={form.phone}
        onChange={(e) => set('phone', e.target.value)}
        placeholder="Phone / WhatsApp"
        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
      />
      <textarea
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        rows={2}
        placeholder="Anything else — occasion, room preference, late checkout…"
        className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? 'Sending…' : 'Check availability & price'}
      </button>
      <p className="text-center text-xs leading-relaxed text-white/60">
        A specialist checks live availability and replies with priced options —
        typically the same working day.
      </p>
    </form>
  );
}
