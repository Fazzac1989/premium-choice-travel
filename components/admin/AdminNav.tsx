'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PACKAGE_BRANDS } from '@/lib/brands';

type NavItem = { href: string; label: string; exact?: boolean };

const GROUP_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/packages', label: 'All packages' },
  { href: '/admin/import', label: 'AI Importer' },
  { href: '/admin/destinations', label: 'Destinations' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/enquiries', label: 'Enquiries' },
];

const ST_ITEMS: NavItem[] = [
  { href: '/admin/school-trips', label: 'Trips', exact: true },
  { href: '/admin/school-trips/quotes', label: 'Quotes' },
  { href: '/admin/school-trips/requests', label: 'Appointments' },
];

const brandItems = (key: string): NavItem[] => [
  { href: `/admin/brands/${key}`, label: 'Overview', exact: true },
  { href: `/admin/brands/${key}/packages`, label: 'Packages' },
  { href: `/admin/brands/${key}/import`, label: 'AI Importer' },
  { href: `/admin/brands/${key}/destinations`, label: 'Destinations' },
  { href: `/admin/brands/${key}/quotes`, label: 'Quotes' },
  { href: `/admin/brands/${key}/enquiries`, label: 'Enquiries' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Which workspace are we in?
  const brandMatch = pathname.match(/^\/admin\/brands\/([a-z-]+)/);
  const workspace = pathname.startsWith('/admin/school-trips')
    ? 'school-trips'
    : brandMatch
      ? brandMatch[1]
      : 'group';

  const items =
    workspace === 'school-trips'
      ? ST_ITEMS
      : workspace === 'group'
        ? GROUP_ITEMS
        : brandItems(workspace);

  const go = (value: string) => {
    if (value === 'group') router.push('/admin');
    else if (value === 'school-trips') router.push('/admin/school-trips');
    else router.push(`/admin/brands/${value}`);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Workspace switcher */}
      <div className="border-b border-white/10 p-4">
        <label className="px-1 pb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
          Workspace
        </label>
        <select
          value={workspace}
          onChange={(e) => go(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white outline-none transition-colors hover:border-teal focus:border-teal [&>option]:text-ink"
        >
          <option value="group">Premium Choice Travel — Group</option>
          {PACKAGE_BRANDS.map((b) => (
            <option key={b.key} value={b.key}>
              Premium Choice {b.label}
            </option>
          ))}
          <option value="school-trips">Premium Choice School Trips</option>
        </select>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
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
    </div>
  );
}
