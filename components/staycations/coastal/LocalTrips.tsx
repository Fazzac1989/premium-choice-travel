'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { readLocalEnquiries, subscribeLocalEnquiries, type LocalEnquiry } from '@/lib/pwa/local-enquiries';

/**
 * Requests sent from this device.
 *
 * A customer who has never signed in still deserves to see what they asked
 * for. This is their own copy, kept in the browser; the real record lives
 * with the specialist, and signing in brings the two together.
 */

function fmt(iso: string, withYear = false) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(d);
}

export default function LocalTrips({ base, signedIn }: { base: string; signedIn: boolean }) {
  const [list, setList] = useState<LocalEnquiry[] | null>(null);

  useEffect(() => {
    const sync = () => setList(readLocalEnquiries());
    sync();
    return subscribeLocalEnquiries(sync);
  }, []);

  if (list === null) return null;
  if (list.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="cc-h4">Sent from this device</h2>
      <p className="cc-support mt-1">
        {signedIn
          ? 'Your own copy of what you asked for. Anything we have already picked up appears above.'
          : 'Kept in this browser. Sign in and these join your account, with what happened next.'}
      </p>
      <ul className="mt-3 space-y-3">
        {list.map((e) => (
          <li key={e.id} className="cc-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={e.hotelHref || `${base}/hotels`} className="font-display text-[20px] font-medium leading-[26px] text-sea-ink hover:text-petrol">
                  {e.hotelName}
                </Link>
                <p className="cc-support mt-0.5">
                  {fmt(e.checkIn)} · {e.nights} night{e.nights === 1 ? '' : 's'} · {e.adults} adult
                  {e.adults === 1 ? '' : 's'}
                  {e.childrenAges.trim() ? `, children ${e.childrenAges.trim()}` : ''}
                </p>
              </div>
              <span className="cc-badge-wait shrink-0">
                <Icon name="clock" size={14} />
                With a specialist
              </span>
            </div>
            <p className="cc-support mt-2">
              Sent {fmt(e.sentAt, true)} · reply by {e.channel || 'email'}
              {e.mealPlan && e.mealPlan !== 'No preference' ? ` · ${e.mealPlan}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
