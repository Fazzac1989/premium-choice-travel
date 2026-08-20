'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export type HeaderDestinationGroup = {
  region: string;
  items: { slug: string; name: string }[];
};

/**
 * Brand-website header, styled to match the master Premium Choice Travel site:
 * fixed, transparent over heroes, white with the colour logo once scrolled.
 * The Holidays site additionally gets a wide landscape Destinations dropdown
 * and an AI Inspiration link.
 */
export default function BrandHeader({
  base,
  name,
  logo,
  logoWhite,
  isHolidays = false,
  isStaycations = false,
  destinationGroups = [],
}: {
  base: string;
  name: string;
  logo: string | null;
  logoWhite: string | null;
  isHolidays?: boolean;
  isStaycations?: boolean;
  destinationGroups?: HeaderDestinationGroup[];
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const home = base || '/';

  // Path relative to this brand site (base is '' on the brand's own domain).
  const rel = (base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || '/';
  const isHeroPage =
    rel === '/' ||
    /^\/journeys\/[^/]+$/.test(rel) ||
    /^\/destinations\/[^/]+$/.test(rel) ||
    /^\/hotels\/[^/]+$/.test(rel);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setDestOpen(false);
  }, [pathname]);

  const isSolid = !isHeroPage || scrolled || open || destOpen;

  const enterDest = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDestOpen(true);
  };
  const leaveDest = () => {
    closeTimer.current = setTimeout(() => setDestOpen(false), 150);
  };

  const linkCls = (href: string) =>
    `text-sm font-semibold transition-colors ${
      isSolid ? 'text-ink hover:text-teal-deep' : 'text-white hover:text-teal'
    } ${rel.startsWith(href) ? (isSolid ? '!text-teal-deep' : '!text-teal') : ''}`;

  const links = [
    ...(isStaycations ? [{ href: '/hotels', label: 'Hotels' }] : [{ href: '/journeys', label: 'Journeys' }]),
    ...(isHolidays ? [{ href: '/inspiration', label: 'AI Inspiration' }] : []),
    { href: '/enquire', label: 'Contact' },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          isSolid ? 'border-b border-line bg-white/95 backdrop-blur' : 'bg-transparent'
        }`}
      >
        <div
          className={`container-site flex items-center justify-between gap-6 transition-[height] duration-300 ${
            isSolid ? 'h-[84px]' : 'h-[104px]'
          }`}
        >
          <Link href={home} aria-label={`${name} — home`} className="shrink-0">
            {(isSolid ? logo : logoWhite) ? (
              <Image
                src={(isSolid ? logo : logoWhite)!}
                alt={name}
                width={524}
                height={130}
                priority
                className={`h-auto transition-[width] duration-300 ${isSolid ? 'w-[240px] max-w-[48vw]' : 'w-[300px] max-w-[55vw]'}`}
              />
            ) : (
              <span className={`font-serif text-xl ${isSolid ? 'text-ink' : 'text-white'}`}>{name}</span>
            )}
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {isHolidays && (
              <div onMouseEnter={enterDest} onMouseLeave={leaveDest} className="relative">
                <button
                  type="button"
                  onClick={() => setDestOpen((v) => !v)}
                  aria-expanded={destOpen}
                  className={`flex items-center gap-1.5 ${linkCls('/destinations')}`}
                >
                  Destinations
                  <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${destOpen ? 'rotate-180' : ''}`}>
                    <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
            {links.map((l) => (
              <Link key={l.href} href={`${base}${l.href}`} className={linkCls(l.href)}>
                {l.label}
              </Link>
            ))}
            <a href="tel:+97144206965" className={`text-sm font-semibold ${isSolid ? 'text-ink-soft' : 'text-white/80'}`}>
              +971 4 420 6965
            </a>
            <Link href={`${base}/enquire`} className="btn-primary !px-5 !py-2.5">
              Plan my trip
            </Link>
          </nav>

          <button
            className={`lg:hidden ${isSolid ? 'text-ink' : 'text-white'}`}
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {/* Landscape destinations panel — Holidays only */}
        {isHolidays && destOpen && destinationGroups.length > 0 && (
          <div
            onMouseEnter={enterDest}
            onMouseLeave={leaveDest}
            className="hidden max-h-[70svh] overflow-y-auto border-t border-line bg-white shadow-2xl shadow-ink/20 lg:block"
          >
            <div className="container-site grid grid-cols-5 gap-x-8 gap-y-6 py-7">
              {destinationGroups.map((g) => (
                <div key={g.region}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-deep">{g.region}</p>
                  <ul className="mt-2.5 space-y-1.5">
                    {g.items.map((d) => (
                      <li key={d.slug}>
                        <Link
                          href={`${base}/destinations/${d.slug}`}
                          className="text-sm font-medium text-ink-soft hover:text-teal-deep"
                        >
                          {d.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-line bg-sand">
              <div className="container-site flex items-center justify-between py-3">
                <p className="text-xs text-ink-soft">Hand-picked destinations for travellers from the UAE.</p>
                <Link href={`${base}/destinations`} className="text-xs font-bold text-teal-deep hover:underline">
                  Explore the world map →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {open && (
          <nav className="max-h-[calc(100svh-84px)] overflow-y-auto border-t border-line bg-white px-5 py-4 lg:hidden">
            {isHolidays && (
              <Link href={`${base}/destinations`} className="block py-3 text-base font-semibold text-ink">
                Destinations
              </Link>
            )}
            {links.map((l) => (
              <Link key={l.href} href={`${base}${l.href}`} className="block py-3 text-base font-semibold text-ink">
                {l.label}
              </Link>
            ))}
            <Link href={`${base}/enquire`} className="btn-primary mt-3 w-full">
              Plan my trip
            </Link>
          </nav>
        )}
      </header>
      {/* Fixed header needs an offset on pages without a full-bleed hero. */}
      {!isHeroPage && <div className="h-[84px]" />}
    </>
  );
}
