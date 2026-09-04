'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The app's bottom navigation. Only visible when the site is running as an
 * installed app (display-mode: standalone) — see `.pwa-only` in globals.css —
 * so the website itself is unchanged.
 */
export default function AppTabBar({ base }: { base: string }) {
  const pathname = usePathname();
  const rel = (base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || '/';

  const tabs = [
    {
      href: `${base}/hotels`,
      label: 'Hotels',
      active: rel.startsWith('/hotels') && !rel.startsWith('/hotels/saved'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 21V8l9-5 9 5v13" />
          <path d="M9 21v-6h6v6" />
        </svg>
      ),
    },
    {
      href: `${base}/hotels/saved`,
      label: 'Saved',
      active: rel.startsWith('/hotels/saved'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
        </svg>
      ),
    },
    {
      href: `${base}/enquiries`,
      label: 'Enquiries',
      active: rel.startsWith('/enquiries'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5h16v11H8l-4 4z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <nav
        aria-label="App navigation"
        className="pwa-only fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid w-full grid-cols-4 px-2 pt-1.5">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={t.active ? 'page' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                t.active ? 'text-teal-deep' : 'text-ink-soft'
              }`}
            >
              {t.icon}
              {t.label}
            </Link>
          ))}
          <a
            href="tel:+97144206965"
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ink-soft"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
            </svg>
            Call us
          </a>
        </div>
      </nav>
      {/* Keeps the last content clear of the fixed bar in app mode. */}
      <div className="pwa-only h-[72px]" aria-hidden="true" />
    </>
  );
}
