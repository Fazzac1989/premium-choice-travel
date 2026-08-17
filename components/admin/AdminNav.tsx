'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/packages', label: 'Packages' },
  { href: '/admin/destinations', label: 'Destinations' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/enquiries', label: 'Enquiries' },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 p-4">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? 'bg-teal text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
