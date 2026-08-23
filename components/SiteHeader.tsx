'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BRANDS } from '@/lib/brands';

const NAV = [
  { href: '/about', label: 'About' },
  { href: 'https://premiumchoiceholidays.com/destinations', label: 'Destinations', external: true },
  { href: '/ai-inspiration', label: 'AI Inspiration' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteHeader({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setBrandsOpen(false);
  }, [pathname]);

  const isSolid = solid || scrolled || open || brandsOpen;

  const enterBrands = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setBrandsOpen(true);
  };
  const leaveBrands = () => {
    closeTimer.current = setTimeout(() => setBrandsOpen(false), 150);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        isSolid ? 'border-b border-line bg-white/95 backdrop-blur' : 'bg-transparent'
      }`}
    >
      <div className="container-site flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="Premium Choice Travel — home">
          <Image
            src={isSolid ? '/images/logo.png' : '/images/logo-white.png'}
            alt="Premium Choice Travel"
            width={177}
            height={46}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          <Link
            href="/about"
            className={`text-sm font-semibold transition-colors ${isSolid ? 'text-ink hover:text-teal-deep' : 'text-white hover:text-teal'}`}
          >
            About
          </Link>

          {/* Our Brands mega menu */}
          <div onMouseEnter={enterBrands} onMouseLeave={leaveBrands} className="relative">
            <button
              type="button"
              onClick={() => setBrandsOpen((v) => !v)}
              aria-expanded={brandsOpen}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                isSolid ? 'text-ink hover:text-teal-deep' : 'text-white hover:text-teal'
              }`}
            >
              Our Brands
              <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${brandsOpen ? 'rotate-180' : ''}`}>
                <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {NAV.slice(1).map((item) => {
            const cls = `text-sm font-semibold transition-colors ${
              isSolid ? 'text-ink hover:text-teal-deep' : 'text-white hover:text-teal'
            } ${!item.external && pathname.startsWith(item.href) ? (isSolid ? '!text-teal-deep' : '!text-teal') : ''}`;
            return item.external ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener" className={cls}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={cls}>
                {item.label}
              </Link>
            );
          })}
          <a href="tel:+97144206965" className={`text-sm font-semibold ${isSolid ? 'text-ink-soft' : 'text-white/80'}`}>
            +971 4 420 6965
          </a>
          <Link href="/plan" className="btn-primary !px-5 !py-2.5">
            Plan My Trip
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

      {/* Mega menu panel — kit navy with white brand lockups */}
      {brandsOpen && (
        <div
          onMouseEnter={enterBrands}
          onMouseLeave={leaveBrands}
          className="hidden border-t border-white/10 bg-ink shadow-2xl shadow-ink/40 lg:block"
        >
          <div className="container-site grid grid-cols-3 gap-2 py-6">
            {BRANDS.map((b) => {
              const inner = (
                <>
                  {b.logoWhite ? (
                    <Image
                      src={b.logoWhite}
                      alt={b.name}
                      width={380}
                      height={106}
                      className="h-[76px] w-auto max-w-full object-contain object-left"
                    />
                  ) : (
                    <p className="font-serif text-lg text-white">{b.name}</p>
                  )}
                  <p className="mt-2 line-clamp-2 text-xs leading-snug text-white/60 group-hover:text-white/80">
                    {b.description}
                  </p>
                  <p className="mt-2 text-xs font-bold text-teal">
                    {b.cta} <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                  </p>
                </>
              );
              const cls = 'group rounded-xl p-4 transition-colors hover:bg-white/5';
              return b.externalUrl ? (
                <a key={b.slug} href={b.externalUrl} target="_blank" rel="noopener" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link key={b.slug} href={`/brands/${b.slug}`} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-white/10 bg-white/5">
            <div className="container-site flex items-center justify-between py-3">
              <p className="text-xs text-white/50">One trusted travel company. Specialist expertise for every journey.</p>
              <Link href="/brands" className="text-xs font-bold text-teal hover:underline">
                All our brands →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {open && (
        <nav className="max-h-[calc(100svh-72px)] overflow-y-auto border-t border-line bg-white px-5 py-4 lg:hidden">
          <Link href="/about" className="block py-3 text-base font-semibold text-ink">About</Link>
          <p className="pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">Our brands</p>
          {BRANDS.map((b) =>
            b.externalUrl ? (
              <a key={b.slug} href={b.externalUrl} target="_blank" rel="noopener" className="block py-2.5 pl-3 text-sm font-semibold text-ink">
                {b.name} ↗
              </a>
            ) : (
              <Link key={b.slug} href={`/brands/${b.slug}`} className="block py-2.5 pl-3 text-sm font-semibold text-ink">
                {b.name}
              </Link>
            )
          )}
          {NAV.slice(1).map((item) =>
            item.external ? (
              <a key={item.href} href={item.href} target="_blank" rel="noopener" className="block py-3 text-base font-semibold text-ink">
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className="block py-3 text-base font-semibold text-ink">
                {item.label}
              </Link>
            )
          )}
          <Link href="/plan" className="btn-primary mt-3 w-full">
            Plan My Trip
          </Link>
        </nav>
      )}
    </header>
  );
}
