'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export type HeaderDestinationGroup = {
  region: string;
  items: { slug: string; name: string }[];
};

/** A column of links in a mega panel: the Holidays menu and the Offers menu. */
export type HeaderHolidayGroup = {
  heading: string;
  items: { slug: string; title: string; href?: string }[];
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
  showOffers = false,
  destinationGroups = [],
  holidayGroups = [],
  offerGroups = [],
}: {
  base: string;
  name: string;
  logo: string | null;
  logoWhite: string | null;
  isHolidays?: boolean;
  isStaycations?: boolean;
  /** Offers pages exist on every brand site but Corporate. */
  showOffers?: boolean;
  destinationGroups?: HeaderDestinationGroup[];
  holidayGroups?: HeaderHolidayGroup[];
  offerGroups?: HeaderHolidayGroup[];
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [holOpen, setHolOpen] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // As an installed app, Staycations has no front page: the logo goes to the hotels.
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const update = () =>
      setStandalone(mq.matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  const home = isStaycations && standalone ? `${base}/hotels` : base || '/';

  // Path relative to this brand site (base is '' on the brand's own domain).
  const rel = (base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || '/';
  const isHeroPage =
    rel === '/' ||
    /^\/journeys\/[^/]+$/.test(rel) ||
    /^\/destinations\/[^/]+$/.test(rel) ||
    // Hotel pages open on a photo; the saved-hotels list does not.
    /^\/hotels\/(?!saved$)[^/]+$/.test(rel);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setDestOpen(false);
    setHolOpen(false);
    setOffersOpen(false);
  }, [pathname]);

  const isSolid = !isHeroPage || scrolled || open || destOpen || holOpen || offersOpen;

  const enterDest = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHolOpen(false);
    setOffersOpen(false);
    setDestOpen(true);
  };
  const enterHol = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDestOpen(false);
    setOffersOpen(false);
    setHolOpen(true);
  };
  const enterOffers = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDestOpen(false);
    setHolOpen(false);
    setOffersOpen(true);
  };
  const leaveOffers = () => {
    closeTimer.current = setTimeout(() => setOffersOpen(false), 150);
  };
  const leaveHol = () => {
    closeTimer.current = setTimeout(() => setHolOpen(false), 150);
  };
  const leaveDest = () => {
    closeTimer.current = setTimeout(() => setDestOpen(false), 150);
  };

  const linkCls = (href: string) =>
    `text-sm font-semibold transition-colors ${
      isSolid ? 'text-ink hover:text-teal-deep' : 'text-white hover:text-teal'
    } ${rel.startsWith(href) ? (isSolid ? '!text-teal-deep' : '!text-teal') : ''}`;

  const links = [
    // Holidays calls them holidays, and gets a panel instead of a link when
    // there are kinds to show; the other brands still sell journeys.
    ...(isStaycations
      ? [{ href: '/hotels', label: 'Hotels' }]
      : isHolidays
        ? holidayGroups.length > 0
          ? []
          : [{ href: '/holidays', label: 'Holidays' }]
        : [{ href: '/journeys', label: 'Journeys' }]),

    ...(showOffers && !(isHolidays && offerGroups.length > 0)
      ? [{ href: '/offers', label: 'Offers' }]
      : []),
    ...(isHolidays ? [] : [{ href: '/about', label: 'Our story' }]),
    { href: '/enquire', label: 'Contact' },
  ];

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          isSolid
            ? 'border-b border-line bg-white/95 backdrop-blur'
            : 'border-b border-white/10 bg-petrol-deep/85 backdrop-blur-[2px]'
        }`}
      >
        {/* Softens the edge of the overlay into the picture below it. */}
        {!isSolid && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-full h-8 bg-gradient-to-b from-[rgba(16,59,69,0.85)] to-transparent"
          />
        )}
        <div
          className="container-site flex h-[72px] items-center justify-between gap-6"
        >
          <Link href={home} aria-label={`${name} — home`} className="shrink-0">
            {(isSolid ? logo : logoWhite) ? (
              <Image
                src={(isSolid ? logo : logoWhite)!}
                alt={name}
                width={524}
                height={130}
                priority
                className="h-10 w-auto max-w-[52vw] lg:h-12"
              />
            ) : (
              <span className={`font-serif text-xl ${isSolid ? 'text-ink' : 'text-white'}`}>{name}</span>
            )}
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {isHolidays && holidayGroups.length > 0 && (
              <div onMouseEnter={enterHol} onMouseLeave={leaveHol} className="relative">
                <button
                  type="button"
                  onClick={() => setHolOpen((v) => !v)}
                  aria-expanded={holOpen}
                  className={`flex items-center gap-1.5 ${linkCls('/holidays')}`}
                >
                  Holidays
                  <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${holOpen ? 'rotate-180' : ''}`}>
                    <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
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
            {isHolidays && offerGroups.length > 0 && (
              <div onMouseEnter={enterOffers} onMouseLeave={leaveOffers} className="relative">
                <button
                  type="button"
                  onClick={() => setOffersOpen((v) => !v)}
                  aria-expanded={offersOpen}
                  className={`flex items-center gap-1.5 ${linkCls('/offers')}`}
                >
                  Offers
                  <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${offersOpen ? 'rotate-180' : ''}`}>
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
            <a href="tel:+97144206965" className={`hidden text-sm font-semibold xl:block ${isSolid ? 'text-ink-soft' : 'text-white/80'}`}>
              +971 4 420 6965
            </a>
            {isHolidays ? (
              <Link href={`${base}/manage`} className="btn-primary !px-5 !py-2.5">
                Sign in &amp; manage booking
              </Link>
            ) : (
              <Link href={`${base}/enquire`} className="btn-primary !px-5 !py-2.5">
                Plan my trip
              </Link>
            )}
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

        {/* Kinds of holiday — Holidays only, and only when there are some */}
        {isHolidays && holOpen && holidayGroups.length > 0 && (
          <MegaPanel
            groups={holidayGroups}
            hrefFor={(c) => `${base}/holidays/${c.slug}`}
            footNote="Not sure yet? Every holiday is reshaped around you."
            footHref={`${base}/holidays`}
            footLabel="See all holidays"
            onEnter={enterHol}
            onLeave={leaveHol}
          />
        )}

        {/* Offers — only the ones that are real; see lib/holidays/offers-menu */}
        {isHolidays && offersOpen && offerGroups.length > 0 && (
          <MegaPanel
            groups={offerGroups}
            hrefFor={(c) => `${base}${c.href ?? `/holidays/${c.slug}`}`}
            footNote="Every holiday is priced for your dates, so the saving is in the planning."
            footHref={`${base}/offers`}
            footLabel="See all offers"
            onEnter={enterOffers}
            onLeave={leaveOffers}
          />
        )}

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
              <>
                {/* On desktop these two are panels, so they are not in `links`
                    and have to be named here or the phone loses them. */}
                <Link href={`${base}/holidays`} className="block py-3 text-base font-semibold text-ink">
                  Holidays
                </Link>
                <Link href={`${base}/destinations`} className="block py-3 text-base font-semibold text-ink">
                  Destinations
                </Link>
                {offerGroups.length > 0 && (
                  <Link href={`${base}/offers`} className="block py-3 text-base font-semibold text-ink">
                    Offers
                  </Link>
                )}
              </>
            )}
            {links.map((l) => (
              <Link key={l.href} href={`${base}${l.href}`} className="block py-3 text-base font-semibold text-ink">
                {l.label}
              </Link>
            ))}
            {isHolidays ? (
              <Link href={`${base}/manage`} className="btn-primary mt-3 w-full">
                Sign in &amp; manage booking
              </Link>
            ) : (
              <Link href={`${base}/enquire`} className="btn-primary mt-3 w-full">
                Plan my trip
              </Link>
            )}
          </nav>
        )}
      </header>
      {/* Fixed header needs an offset on pages without a full-bleed hero. */}
      {!isHeroPage && <div className="h-[84px]" />}
    </>
  );
}

/**
 * One wide panel of linked columns, shared by the Holidays and Offers menus.
 *
 * Destinations keeps its own markup: it is a different shape, grouped by region
 * and five columns wide, and folding it in here would make this take a flag.
 */
function MegaPanel({
  groups,
  hrefFor,
  footNote,
  footHref,
  footLabel,
  onEnter,
  onLeave,
}: {
  groups: HeaderHolidayGroup[];
  hrefFor: (item: HeaderHolidayGroup['items'][number]) => string;
  footNote: string;
  footHref: string;
  footLabel: string;
  onEnter: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="hidden max-h-[70svh] overflow-y-auto border-t border-line bg-white shadow-2xl shadow-ink/20 lg:block"
    >
      <div className="container-site grid grid-cols-3 gap-x-10 gap-y-6 py-7">
        {groups.map((g) => (
          <div key={g.heading}>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-deep">{g.heading}</p>
            <ul className="mt-2.5 space-y-1.5">
              {g.items.map((item) => (
                <li key={item.slug}>
                  <Link href={hrefFor(item)} className="text-sm font-medium text-ink-soft hover:text-teal-deep">
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line bg-sand">
        <div className="container-site flex items-center justify-between py-3.5">
          <p className="text-sm text-ink-soft">{footNote}</p>
          <Link href={footHref} className="text-sm font-bold text-teal-deep hover:underline">
            {footLabel} &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
