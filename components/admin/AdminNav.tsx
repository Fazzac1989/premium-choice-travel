'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PACKAGE_BRANDS } from '@/lib/brands';

type NavItem = { href: string; label: string; exact?: boolean };
/** A heading has no href: it labels the group of links beneath it. */
type NavEntry = NavItem | { heading: string };
const isHeading = (e: NavEntry): e is { heading: string } => 'heading' in e;

const GROUP_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/packages', label: 'All journeys' },
  { href: '/admin/import', label: 'AI Importer' },
  { href: '/admin/destinations', label: 'Destinations' },
  { href: '/admin/hotels', label: 'Hotels' },
  { href: '/admin/experiences', label: 'Experiences' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/requests', label: 'Booking requests' },
  { href: '/admin/enquiries', label: 'Enquiries' },
];

const ST_ITEMS: NavEntry[] = [
  // What the public sees, and what it is built from.
  { heading: 'Website' },
  { href: '/admin/school-trips', label: 'Trips', exact: true },
  { href: '/admin/school-trips/import', label: 'AI Importer' },
  { href: '/admin/school-trips/subjects', label: 'Subjects' },
  { href: '/admin/school-trips/countries', label: 'Countries' },
  { href: '/admin/school-trips/cities', label: 'Cities' },
  { href: '/admin/school-trips/website', label: 'Website content' },
  { href: '/admin/school-trips/media', label: 'Media' },

  // What goes to a school, and what comes back.
  { heading: 'Commercial' },
  { href: '/admin/school-trips/proposals', label: 'Proposals' },
  { href: '/admin/school-trips/brochures', label: 'Brochure Studio' },
  { href: '/admin/school-trips/teachers', label: 'Teachers' },
  { href: '/admin/school-trips/requests', label: 'Appointments' },
  { href: '/admin/school-trips/planning', label: 'Trip planning' },
  { href: '/admin/school-trips/terms', label: 'Booking terms' },
  { href: '/admin/school-trips/analytics', label: 'Analytics' },
];

const brandItems = (key: string): NavItem[] => [
  { href: `/admin/brands/${key}`, label: 'Overview', exact: true },
  { href: `/admin/brands/${key}/packages`, label: 'Journeys' },
  { href: `/admin/brands/${key}/import`, label: 'AI Importer' },
  { href: `/admin/brands/${key}/destinations`, label: 'Destinations' },
  { href: `/admin/brands/${key}/hotels`, label: 'Hotels' },
  { href: `/admin/brands/${key}/quotes`, label: 'Quotes' },
  // Hotel booking requests (Hotelbeds confirmations) only exist for Staycations.
  ...(key === 'staycations' ? [{ href: '/admin/requests', label: 'Booking requests' }] : []),
  { href: `/admin/brands/${key}/enquiries`, label: 'Enquiries' },
];

export default function AdminNav({ role = 'admin' }: { role?: 'admin' | 'reviewer' | 'customer' }) {
  const pathname = usePathname();
  const router = useRouter();

  // A reviewer gets one link and no workspace switcher.
  if (role === 'reviewer') {
    const active = pathname.startsWith('/admin/requests');
    return (
      <nav className="flex-1 space-y-1 p-4">
        <Link
          href="/admin/requests"
          className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
            active ? 'bg-teal text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          Booking requests
        </Link>
      </nav>
    );
  }

  // Which workspace are we in?
  const brandMatch = pathname.match(/^\/admin\/brands\/([a-z-]+)/);
  const workspace = pathname.startsWith('/admin/school-trips')
    ? 'school-trips'
    : brandMatch
      ? brandMatch[1]
      : 'group';

  const items: NavEntry[] =
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
        {items.map((entry, i) => {
          if (isHeading(entry)) {
            return (
              <p
                key={entry.heading}
                className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 ${
                  i === 0 ? 'pt-1' : 'pt-5'
                }`}
              >
                {entry.heading}
              </p>
            );
          }
          const item = entry;
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
