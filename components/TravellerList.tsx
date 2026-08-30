'use client';

import { useState } from 'react';
import TravellerForm from '@/components/TravellerForm';
import { deleteTraveller } from '@/lib/traveller-actions';
import type { Traveller } from '@/lib/travellers';

/** Client-side mirror of lib/travellers — same rule, so the list can warn. */
function warn(expiry: string): string | null {
  if (!expiry) return null;
  const end = new Date(`${expiry}T00:00:00Z`).getTime();
  if (Number.isNaN(end)) return null;
  const days = Math.round((end - Date.now()) / 86_400_000);
  if (days < 0) return 'This passport has expired.';
  if (days < 183) return 'Under six months left — many airlines will refuse this.';
  return null;
}

function mask(value: string) {
  const v = value.trim();
  if (v.length < 4) return v ? '••••' : '';
  return `${'•'.repeat(Math.max(2, v.length - 4))}${v.slice(-4)}`;
}

export default function TravellerList({ travellers }: { travellers: Traveller[] }) {
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(travellers.length === 0);

  return (
    <div className="space-y-4">
      {travellers.map((t) => {
        const alert = warn(t.passportExpiry);
        return editing === t.id ? (
          <div key={t.id}>
            <TravellerForm traveller={t} onDone={() => setEditing(null)} />
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="mt-2 text-sm font-semibold text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div key={t.id} className="rounded-2xl border border-line p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-serif text-lg text-ink">{t.fullName}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {[t.label, t.nationality, t.dateOfBirth ? `b. ${t.dateOfBirth}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'No other details yet'}
                </p>
                {t.passportNumber && (
                  <p className="mt-1 text-sm text-ink-soft">
                    Passport {mask(t.passportNumber)}
                    {t.passportExpiry ? ` · expires ${t.passportExpiry}` : ''}
                  </p>
                )}
                {t.notes && <p className="mt-1 text-sm text-ink-soft">{t.notes}</p>}
                {alert && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-ink">
                    {alert}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(t.id)}
                  className="text-sm font-semibold text-teal-deep hover:underline"
                >
                  Edit
                </button>
                <form action={deleteTraveller}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-sm font-semibold text-ink-soft hover:text-red-600">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })}

      {adding ? (
        <div>
          <TravellerForm onDone={() => setAdding(false)} />
          {travellers.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="mt-2 text-sm font-semibold text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-primary">
          Add another traveller
        </button>
      )}
    </div>
  );
}
