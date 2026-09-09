'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

export function CoastalHeader({
  base,
  logo,
  logoWhite,
}: {
  base: string;
  logo: string | null;
  logoWhite: string | null;
}) {
  const rel = useRel(base);
  const tabs = tabsFor(base);
  const active = activeHref(tabs, rel);

  // Explore opens on a full-bleed photograph, so the bar sits on the picture
  // until the page moves and then becomes solid white to stay readable.
  const overHero = rel === '/';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!overHero) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);
  const solid = !overHero || scrolled;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300 ${
          solid ? 'border-sea-line bg-white/95 backdrop-blur' : 'border-transparent bg-transparent'
        }`}
      >
      <div className="cc-wrap flex h-[60px] items-center justify-between gap-4 lg:h-[68px]">
        <Link href={base || '/'} aria-label="Premium Choice Staycations — Explore" className="shrink-0">
          {(solid ? logo : logoWhite ?? logo) ? (
            <Image
              src={(solid ? logo : logoWhite ?? logo)!}
              alt="Premium Choice Staycations"
              width={524}
              height={130}
              priority
              className="h-8 w-auto lg:h-9"
            />
          ) : (
            <span className="flex flex-col leading-none">
              <span className={`font-display text-[19px] font-semibold ${solid ? 'text-sea-ink' : 'text-white'}`}>
                Premium Choice
              </span>
              <span
                className={`text-[10px] font-medium uppercase tracking-[0.28em] ${solid ? 'text-sea-soft' : 'text-white/80'}`}
              >
                Staycations
              </span>
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
                solid
                  ? active === t.href
                    ? 'bg-mist text-petrol'
                    : 'text-sea-soft hover:text-sea-ink'
                  : active === t.href
                    ? 'bg-white/15 text-white'
                    : 'text-white/85 hover:text-white'
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
            className={`hidden min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-[15px] font-medium lg:inline-flex ${
              solid ? 'text-sea-soft hover:text-sea-ink' : 'text-white/85 hover:text-white'
            }`}
          >
            <Icon name="phone" size={18} />
            +971 4 420 6965
          </a>
          <Link
            href="/account"
            aria-label="Your account"
            className={`cc-icon-btn ${solid ? 'text-sea-ink hover:bg-mist' : 'text-white hover:bg-white/15'}`}
          >
            <Icon name="user" size={22} />
          </Link>
        </div>
        </div>
      </header>
      {/* A fixed bar leaves no space behind it. Pages without a full-bleed
          photograph need that space back; Explore keeps the picture. */}
      {!overHero && <div className="h-[60px] lg:h-[68px]" aria-hidden="true" />}
    </>
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
