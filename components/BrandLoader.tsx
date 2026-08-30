'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * A branded waiting state for the room search.
 *
 * A supplier search takes several seconds, which is long enough that a bare
 * spinner reads as broken. The ring fills quickly at first and then slows,
 * because that matches what is actually happening: most of the wait is the
 * supplier thinking, and we cannot know how long that will be. It deliberately
 * stops short of 100 until the rooms are really here — a bar that hits 100%
 * and then keeps spinning is worse than no bar at all.
 */
export default function BrandLoader({
  logo,
  label = 'Checking live prices',
  sublabel,
  /** Flip to true when the data lands; the ring completes, then hands over. */
  done = false,
}: {
  logo?: string | null;
  label?: string;
  sublabel?: string;
  done?: boolean;
}) {
  const [pct, setPct] = useState(6);

  useEffect(() => {
    if (done) {
      setPct(100);
      return;
    }
    // Ease towards 92 and wait there. Each tick closes part of the remaining
    // gap, so it never stalls entirely and never arrives early.
    const id = setInterval(() => {
      setPct((p) => (p >= 92 ? p : p + Math.max(0.6, (92 - p) * 0.08)));
    }, 120);
    return () => clearInterval(id);
  }, [done]);

  const r = 52;
  const circumference = 2 * Math.PI * r;
  const shown = Math.round(pct);

  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="relative h-[132px] w-[132px]">
        <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
          <circle cx="66" cy="66" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-line" />
          <circle
            cx="66"
            cy="66"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-teal transition-[stroke-dashoffset] duration-200 ease-out"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - shown / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {logo ? (
            <Image src={logo} alt="" width={72} height={22} className="h-auto w-[62px] opacity-90" />
          ) : (
            <span className="font-serif text-2xl text-teal-deep">P</span>
          )}
          <span className="mt-1 text-sm font-bold tabular-nums text-ink">{shown}%</span>
        </div>
      </div>
      <p className="mt-5 font-serif text-xl text-ink">{label}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {sublabel ?? 'We ask the supplier directly, so this takes a few seconds.'}
      </p>
    </div>
  );
}
