'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon, { type IconName } from './Icon';
import { useTabsHidden } from './Chrome';

/**
 * The Staycations app shell: a compact bar at the top, four destinations at
 * the bottom on a phone, one slim row across the top on a laptop.
 *
 * Explore, Saved, Trips and Concierge are the whole app — everything else is
 * reached from inside them, so the bar never grows a fifth thing.
 */

type Tab = { href: string; label: string; icon: IconName; match: (rel: string) => boolean };

const tabsFor = (base: string): Tab[] => [
  { href: base || '/', label: 'Explore', icon: 'explore', match: (r) => r === '/' || r.startsWith('/hotels') },
  { href: `${base}/saved`, label: 'Saved', icon: 'heart', match: (r) => r.startsWith('/saved') },
  { href: `${base}/trips`, label: 'Trips', icon: 'trips', match: (r) => r.startsWith('/trips') },
  { href: `${base}/concierge`, label: 'Concierge', icon: 'concierge', match: (r) => r.startsWith('/concierge') },
];

/** Saved sits under Explore's tree, so it must win over the Explore match. */
function activeHref(tabs: Tab[], rel: string) {
  const saved = tabs.find((t) => t.label === 'Saved')!;
  if (rel.startsWith('/saved')) return saved.href;
  return tabs.find((t) => t.match(rel))?.href ?? '';
}

function useRel(base: string) {
  const pathname = usePathname();
  return (base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || '/';
}

export function CoastalHeader({ base, logo }: { base: string; logo: string | null }) {
  const rel = useRel(base);
  const tabs = tabsFor(base);
  const active = activeHref(tabs, rel);

  return (
    <header className="sticky top-0 z-40 border-b border-sea-line bg-white/95 backdrop-blur">
      <div className="cc-wrap flex h-[60px] items-center justify-between gap-4 lg:h-[68px]">
        <Link href={base || '/'} aria-label="Premium Choice Staycations — Explore" className="shrink-0">
          {logo ? (
            <Image src={logo} alt="Premium Choice Staycations" width={524} height={130} priority className="h-8 w-auto lg:h-9" />
          ) : (
            <span className="flex flex-col leading-none">
              <span className="font-display text-[19px] font-semibold text-sea-ink">Premium Choice</span>
              <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-sea-soft">Staycations</span>
            </span>
          )}
        </Link>

        {/* Laptop: the four destinations sit in the top bar instead. */}
        <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active === t.href ? 'page' : undefined}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-3.5 text-[15px] font-medium transition-colors ${
                active === t.href ? 'bg-mist text-petrol' : 'text-sea-soft hover:text-sea-ink'
              }`}
            >
              <Icon name={t.icon} size={18} />
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <a
            href="tel:+97144206965"
            className="hidden min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-[15px] font-medium text-sea-soft hover:text-sea-ink lg:inline-flex"
          >
            <Icon name="phone" size={18} />
            +971 4 420 6965
          </a>
          <Link href="/account" aria-label="Your account" className="cc-icon-btn text-sea-ink hover:bg-mist">
            <Icon name="user" size={22} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function CoastalTabBar({ base }: { base: string }) {
  const rel = useRel(base);
  const hidden = useTabsHidden();
  const tabs = tabsFor(base);
  const active = activeHref(tabs, rel);
  if (hidden) return null;

  return (
    <>
      {/* Keeps the last of the page clear of the fixed bar. */}
      <div className="h-[76px] lg:hidden" aria-hidden="true" />
      <nav
        aria-label="App sections"
        className="cc-safe fixed inset-x-0 bottom-0 z-40 border-t border-sea-line bg-white/97 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map((t) => {
            const on = active === t.href;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={on ? 'page' : undefined}
                  className={`flex min-h-[60px] flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-medium transition-colors ${
                    on ? 'text-petrol' : 'text-sea-soft'
                  }`}
                >
                  <Icon name={on && t.icon === 'heart' ? 'heart-filled' : t.icon} size={22} />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
