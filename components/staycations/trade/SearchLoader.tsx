'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

/**
 * The waiting screen while we ask the hotels for today's prices (founder, 2026-10-03: "show the
 * user something is loading — the brand logo with a % loading circle"). A live search takes
 * several seconds, long enough that nothing on screen reads as broken. The ring fills quickly,
 * then slows, and waits short of 100 until the page really arrives — a ring that reaches 100%
 * and keeps spinning is worse than none.
 */
export default function SearchLoader({
  label = 'Finding your stay',
  sublabel = 'We are asking the hotels for today’s prices. This takes a few seconds.',
}: {
  label?: string;
  sublabel?: string;
}) {
  const [pct, setPct] = useState(4);

  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => (p >= 94 ? p : p + Math.max(0.4, (94 - p) * 0.06)));
    }, 120);
    return () => clearInterval(id);
  }, []);

  const r = 58;
  const circumference = 2 * Math.PI * r;
  const shown = Math.round(pct);

  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="relative h-[144px] w-[144px]">
        <svg viewBox="0 0 144 144" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="72" cy="72" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-sea-line" />
          <circle
            cx="72"
            cy="72"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            className="text-petrol transition-[stroke-dashoffset] duration-200 ease-out"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - shown / 100)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Image src="/images/brands/staycations.png" alt="" width={84} height={26} className="h-auto w-[78px]" priority />
          <span className="mt-1.5 text-[15px] font-semibold tabular-nums text-sea-ink">{shown}%</span>
        </div>
      </div>
      <p className="cc-h3 mt-6">{label}</p>
      <p className="cc-body mt-1 max-w-sm text-sea-soft">{sublabel}</p>
      <span className="sr-only">{shown} percent</span>
    </div>
  );
}
