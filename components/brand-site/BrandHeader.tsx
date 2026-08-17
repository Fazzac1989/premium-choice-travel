'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function BrandHeader({
  base,
  name,
  logoWhite,
}: {
  base: string;
  name: string;
  logoWhite: string | null;
}) {
  const [open, setOpen] = useState(false);
  const home = base || '/';

  const links = [
    { href: `${base}/packages`, label: 'Our trips' },
    { href: `${base}/enquire`, label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink">
      <div className="container-site flex h-[72px] items-center justify-between gap-6">
        <Link href={home} aria-label={`${name} — home`} className="shrink-0">
          {logoWhite ? (
            <Image src={logoWhite} alt={name} width={280} height={78} priority className="h-11 w-auto" />
          ) : (
            <span className="font-serif text-xl text-white">{name}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-semibold text-white/85 hover:text-teal">
              {l.label}
            </Link>
          ))}
          <a href="tel:+97144206965" className="text-sm font-semibold text-white/60">
            +971 4 420 6965
          </a>
          <Link href={`${base}/enquire`} className="btn-primary !px-5 !py-2.5">
            Plan my trip
          </Link>
        </nav>

        <button className="text-white md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 bg-ink px-5 py-4 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block py-3 text-base font-semibold text-white" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href={`${base}/enquire`} className="btn-primary mt-3 w-full" onClick={() => setOpen(false)}>
            Plan my trip
          </Link>
        </nav>
      )}
    </header>
  );
}
