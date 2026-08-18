'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PCT_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/packages', label: 'Packages' },
  { href: '/admin/import', label: 'AI Importer' },
  { href: '/admin/destinations', label: 'Destinations' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/enquiries', label: 'Enquiries' },
];

const ST_ITEMS = [
  { href: '/admin/school-trips', label: 'Trips', exact: true },
  { href: '/admin/school-trips/quotes', label: 'Quotes' },
  { href: '/admin/school-trips/requests', label: 'Appointments' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const inSchoolTrips = pathname.startsWith('/admin/school-trips');
  const items = inSchoolTrips ? ST_ITEMS : PCT_ITEMS;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Company switcher */}
      <div className="border-b border-white/10 p-4">
        <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Workspace</p>
        <div className="space-y-1">
          <Link
            href="/admin"
            className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              !inSchoolTrips ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            Premium Choice Travel
            <span className="block text-[10px] font-normal text-white/40">Holidays · Staycations · Cruise · Golf · Corporate</span>
          </Link>
          <Link
            href="/admin/school-trips"
            className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              inSchoolTrips ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            School Trips
            <span className="block text-[10px] font-normal text-white/40">Educational travel platform</span>
          </Link>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const active = 'exact' in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
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
    </div>
  );
}
