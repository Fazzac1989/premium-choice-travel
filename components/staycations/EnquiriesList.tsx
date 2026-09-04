'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readLocalEnquiries, subscribeLocalEnquiries, type LocalEnquiry } from '@/lib/pwa/local-enquiries';

function fmtDate(iso: string, withYear = false) {
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

function stay(e: LocalEnquiry) {
  const party = [`${e.adults} adult${e.adults === 1 ? '' : 's'}`, e.childrenAges.trim() ? `children ${e.childrenAges.trim()}` : ''].filter(Boolean);
  return `${fmtDate(e.checkIn)} · ${e.nights} night${e.nights === 1 ? '' : 's'} · ${party.join(', ')}`;
}

export default function EnquiriesList({ base }: { base: string }) {
  const [list, setList] = useState<LocalEnquiry[] | null>(null);

  useEffect(() => {
    const sync = () => setList(readLocalEnquiries());
    sync();
    return subscribeLocalEnquiries(sync);
  }, []);

  if (list === null) return null;

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-line p-10 text-center">
        <p className="font-serif text-2xl text-ink">No enquiries from this device yet.</p>
        <p className="mt-3 text-ink-soft">Open any hotel and check dates — your request will be listed here.</p>
        <Link href={`${base}/hotels`} className="btn-primary mt-6">Find a hotel</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {list.map((e) => (
        <div key={e.id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={e.hotelHref || `${base}/hotels`} className="font-serif text-xl leading-snug text-ink hover:text-teal-deep">
                {e.hotelName}
              </Link>
              <p className="mt-1 text-sm text-ink-soft">{stay(e)}</p>
              {e.mealPlan && e.mealPlan !== 'No preference' && (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-teal-deep">{e.mealPlan}</p>
              )}
            </div>
            <span className="shrink-0 rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-teal-deep">
              With a specialist
            </span>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Sent {fmtDate(e.sentAt, true)} · reply by {e.channel || 'email'}
          </p>
        </div>
      ))}
    </div>
  );
}
