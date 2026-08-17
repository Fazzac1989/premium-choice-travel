'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/destinations', label: 'Destinations' },
  { href: '/packages', label: 'Packages' },
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact' },
];

export default function SiteHeader({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isSolid = solid || scrolled || open;

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

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-semibold transition-colors ${
                isSolid ? 'text-ink hover:text-teal-deep' : 'text-white hover:text-teal'
              } ${pathname.startsWith(item.href) ? (isSolid ? '!text-teal-deep' : '!text-teal') : ''}`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href="tel:+97144206965"
            className={`text-sm font-semibold ${isSolid ? 'text-ink-soft' : 'text-white/80'}`}
          >
            +971 4 420 6965
          </a>
          <Link href="/contact" className="btn-primary !px-5 !py-2.5">
            Plan my trip
          </Link>
        </nav>

        <button
          className={`md:hidden ${isSolid ? 'text-ink' : 'text-white'}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-white px-5 py-4 md:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="block py-3 text-base font-semibold text-ink">
              {item.label}
            </Link>
          ))}
          <Link href="/contact" className="btn-primary mt-3 w-full">
            Plan my trip
          </Link>
        </nav>
      )}
    </header>
  );
}
