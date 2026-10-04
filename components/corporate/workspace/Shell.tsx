import Link from 'next/link';
import { WORKSPACE_NAV, type Ctx } from './parts';

export const DEMO_ROLES = [
  { key: 'finance', label: 'Finance' },
  { key: 'approver', label: 'Approver' },
  { key: 'arranger', label: 'Arranger' },
  { key: 'traveller', label: 'Traveller' },
] as const;

/**
 * The frame around every workspace screen: the company, the role-based menu
 * (only what this person may open), and — in the demo — a clear label and a
 * way to see the workspace as each role.
 */
export default function Shell({
  c,
  current,
  demoRole,
  demoRoot,
  children,
}: {
  c: Ctx;
  /** The menu path of the open screen ('' = overview). */
  current: string;
  demoRole?: string;
  demoRoot?: string;
  children: React.ReactNode;
}) {
  const nav = WORKSPACE_NAV.filter((n) => n.show(c.me));
  return (
    <main className="min-h-[70vh] bg-sand/60">
      {c.demo && (
        <div className="border-b border-wait-ink/20 bg-wait-bg">
          <div className="container-site flex flex-wrap items-center justify-between gap-3 py-3 text-sm text-wait-ink">
            <p>
              <strong>Demo workspace.</strong> A fictional company with invented trips, bookings and amounts — nothing
              here is a real booking, ticket or payment, and nothing you do is saved.
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider">View as</span>
              {DEMO_ROLES.map((r) => (
                <Link
                  key={r.key}
                  href={`${demoRoot}/${r.key}${current}`}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${r.key === demoRole ? 'bg-wait-ink text-white' : 'bg-white text-wait-ink hover:bg-white/70'}`}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container-site grid gap-8 py-8 lg:grid-cols-[220px_1fr] lg:py-10">
        <aside className="min-w-0">
          <p className="hidden text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft lg:block">Client workspace</p>
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:mt-3 lg:flex-col lg:px-0">
            {nav.map((n) => {
              const active = n.href === '' ? current === '' : current.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={`${c.base}${n.href}`}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-teal-deep text-white' : 'text-ink hover:bg-white'}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 text-sm lg:mt-6 lg:block lg:border-t lg:border-line lg:pt-4">
            <p className="font-semibold text-ink">{c.me.fullName}</p>
            <p className="text-xs text-ink-soft">{c.s.company.name}</p>
            <p className="mt-4 hidden text-xs leading-relaxed text-ink-soft lg:block">
              Need help with a trip? Call your account team on{' '}
              <a href="tel:+97144206965" className="font-semibold text-teal-deep">+971 4 420 6965</a>, or the 24/7 number in your travel documents out of hours.
            </p>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
