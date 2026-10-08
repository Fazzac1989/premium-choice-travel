'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GOLF_TRIP_TYPES } from '@/lib/golf/catalogue';

const PHONE = '+971 4 420 6965';
const TEL = 'tel:+97144206965';

/**
 * The golf header: white chrome in two rows, the way golf catalogues are
 * built. Row one carries the logo, a search pill that is always there, and
 * the ways to reach a person; row two is the catalogue's own front doors.
 * It scrolls away with the page — the search lives on every page anyway.
 */
export default function GolfHeader({ base, logo, name }: { base: string; logo: string | null; name: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname, params]);

  const rel = (base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || '/';
  const length = params.get('length');
  const nav = [
    { href: '/destinations', label: 'Destinations', active: rel.startsWith('/destinations') },
    { href: '/journeys', label: 'Golf holidays', active: rel.startsWith('/journeys') && length !== 'short' },
    { href: '/journeys?length=short', label: 'Golf breaks', active: rel.startsWith('/journeys') && length === 'short' },
    { href: '/groups', label: 'Groups & societies', active: rel.startsWith('/groups') },
    { href: '/offers', label: 'Offers', active: rel.startsWith('/offers') },
  ];

  return (
    <header className="relative z-40 border-b border-golf-line bg-white">
      <div className="container-site flex h-[68px] items-center gap-4 lg:gap-8">
        <Link href={base || '/'} className="shrink-0" aria-label={`${name} — home`}>
          {logo ? (
            <Image src={logo} alt={name} width={210} height={56} priority className="h-10 w-auto sm:h-11" />
          ) : (
            <span className="text-lg font-extrabold text-golf-navy">{name}</span>
          )}
        </Link>

        <SearchPill action={`${base}/journeys`} className="hidden flex-1 md:flex" />

        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <a href={TEL} className="text-sm font-bold text-golf-navy hover:text-fairway">{PHONE}</a>
          <Link href={`${base}/enquire`} className="btn-primary whitespace-nowrap !px-5 !py-2.5 text-sm">
            Plan my trip
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto rounded-lg p-2 text-golf-navy lg:hidden"
          aria-expanded={open}
          aria-controls="golf-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* Row two: the catalogue's front doors */}
      <nav aria-label="Golf holidays" className="hidden border-t border-golf-line bg-white lg:block">
        <div className="container-site flex items-center justify-center gap-1">
          {nav.slice(0, 3).map((l) => <NavLink key={l.label} base={base} {...l} />)}
          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1.5 border-b-[3px] border-transparent px-4 py-3 text-[13px] font-extrabold uppercase tracking-wide text-golf-navy hover:text-fairway group-focus-within:text-fairway"
            >
              Holiday types
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
            </button>
            <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 rounded-b-xl border border-golf-line bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {GOLF_TRIP_TYPES.map((t) => (
                <Link key={t.key} href={`${base}/journeys?type=${t.key}`}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-golf-navy hover:bg-golf-mist hover:text-fairway">
                  {t.label}
                </Link>
              ))}
            </div>
          </div>
          {nav.slice(3).map((l) => <NavLink key={l.label} base={base} {...l} />)}
          <NavLink base={base} href="/enquire" label="Contact" active={rel.startsWith('/enquire')} />
        </div>
      </nav>

      {open && (
        <div id="golf-menu" className="border-t border-golf-line bg-white pb-6 lg:hidden">
          <div className="container-site pt-4">
            <SearchPill action={`${base}/journeys`} className="flex md:hidden" />
            <ul className="mt-3 divide-y divide-golf-line">
              {[...nav, { href: '/enquire', label: 'Contact', active: false }].map((l) => (
                <li key={l.label}>
                  <Link href={`${base}${l.href}`} className="block py-3 font-bold text-golf-navy">{l.label}</Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-soft">Holiday types</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOLF_TRIP_TYPES.map((t) => (
                <Link key={t.key} href={`${base}/journeys?type=${t.key}`}
                  className="rounded-full border border-golf-line px-3 py-1.5 text-sm font-semibold text-golf-navy">
                  {t.label}
                </Link>
              ))}
            </div>
            <a href={TEL} className="btn-outline mt-5 w-full">Call {PHONE}</a>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ base, href, label, active }: { base: string; href: string; label: string; active: boolean }) {
  return (
    <Link
      href={`${base}${href}`}
      aria-current={active ? 'page' : undefined}
      className={`border-b-[3px] px-4 py-3 text-[13px] font-extrabold uppercase tracking-wide transition-colors ${
        active ? 'border-fairway text-fairway' : 'border-transparent text-golf-navy hover:text-fairway'
      }`}
    >
      {label}
    </Link>
  );
}

/** The always-there search: where you want to play, and when. */
export function SearchPill({ action, className = '' }: { action: string; className?: string }) {
  return (
    <form action={action} method="get" role="search"
      className={`max-w-2xl items-stretch overflow-hidden rounded-full border border-golf-line bg-white shadow-sm focus-within:border-fairway ${className}`}>
      <label className="flex min-w-0 flex-1 items-center gap-2 pl-4">
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0E7A70" strokeWidth="2.2"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
        <span className="sr-only">Where do you want to play?</span>
        <input name="q" type="search" placeholder="Search for a destination, hotel or course…"
          className="w-full min-w-0 bg-transparent py-2.5 text-sm text-golf-navy outline-none placeholder:text-ink-soft/70" />
      </label>
      <label className="hidden items-center border-l border-golf-line pl-3 sm:flex">
        <span className="sr-only">When</span>
        <select name="month" defaultValue="" className="bg-transparent py-2.5 pr-2 text-sm text-golf-navy outline-none">
          <option value="">Any month</option>
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="m-1 flex items-center gap-2 rounded-full bg-golf-navy px-4 text-sm font-bold text-white hover:bg-golf-navy-soft">
        <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
