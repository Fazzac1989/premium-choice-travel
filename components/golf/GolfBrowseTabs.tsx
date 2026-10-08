'use client';

import Link from 'next/link';
import { useState } from 'react';

export type BrowseGroup = { heading: string; links: { href: string; label: string }[] };
export type BrowseTab = { key: string; label: string; groups: BrowseGroup[] };

/** "Browse golf holidays": one index, several ways in, a tab each. */
export default function GolfBrowseTabs({ tabs }: { tabs: BrowseTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-label="Browse by" className="flex gap-6 overflow-x-auto border-b border-golf-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            id={`browse-tab-${t.key}`}
            aria-selected={t.key === tab.key}
            aria-controls={`browse-panel-${t.key}`}
            onClick={() => setActive(t.key)}
            className={`-mb-px shrink-0 border-b-[3px] pb-3 text-[13px] font-extrabold uppercase tracking-wide ${
              t.key === tab.key ? 'border-golf-navy text-golf-navy' : 'border-transparent text-fairway hover:text-golf-navy'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`browse-panel-${tab.key}`}
        aria-labelledby={`browse-tab-${tab.key}`}
        className="grid gap-8 pt-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {tab.groups.map((g) => (
          <div key={g.heading}>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-golf-navy">{g.heading}</p>
            <ul className="mt-3 space-y-1.5">
              {g.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-ink-soft hover:text-fairway hover:underline">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
