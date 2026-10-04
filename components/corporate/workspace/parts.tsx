import Link from 'next/link';
import { hasRole, STAGE_LABELS, type Stage } from '@/lib/corporate/workspace/rules';
import { formatMoney, type Member, type Snapshot } from '@/lib/corporate/workspace/types';

/** Everything a workspace screen needs. The same screens serve the live workspace and the demo. */
export type Ctx = {
  s: Snapshot;
  me: Member;
  /** Link prefix for this workspace, e.g. /workspace or /workspace/demo/finance. */
  base: string;
  demo: boolean;
  now: Date;
  /** The finance CSV for this workspace (the demo has its own). */
  exportHref: string;
  /** Query string carried by forms and banners (?error=…, ?sent=1). */
  search: Record<string, string | undefined>;
};

export type NavItem = { href: string; label: string; show: (m: Member) => boolean };

export const WORKSPACE_NAV: NavItem[] = [
  { href: '', label: 'Overview', show: () => true },
  { href: '/trips', label: 'Trips', show: () => true },
  { href: '/approvals', label: 'Approvals', show: (m) => hasRole(m, 'approver') },
  { href: '/spend', label: 'Spend', show: (m) => hasRole(m, 'finance') || hasRole(m, 'approver') },
  { href: '/finance', label: 'Invoices & credits', show: (m) => hasRole(m, 'finance') },
  { href: '/team', label: 'Team & policy', show: (m) => hasRole(m, 'finance') || hasRole(m, 'arranger') },
];

export const money = formatMoney;

export const memberName = (s: Snapshot, id: string | null) => s.members.find((m) => m.id === id)?.fullName ?? '—';

export const centreLabel = (s: Snapshot, id: string | null) => {
  const c = s.costCentres.find((c) => c.id === id);
  return c ? `${c.code} · ${c.name}` : 'Not coded';
};

export function formatDate(iso: string | null, withYear = false) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'Asia/Dubai' });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });
}

const STAGE_TONE: Record<Stage, string> = {
  cancelled: 'bg-line text-ink-soft',
  requested: 'bg-wait-bg text-wait-ink',
  options: 'bg-wait-bg text-wait-ink',
  approved: 'bg-mist text-petrol',
  booked: 'bg-ok-bg text-ok-ink',
  travelled: 'bg-sand text-ink',
};

export function StageChip({ stage }: { stage: Stage }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE_TONE[stage]}`}>
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="font-serif text-lg text-ink">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">{label}</p>
      <p className="mt-2 font-serif text-2xl text-ink">{value}</p>
      {note && <p className="mt-1 text-xs leading-relaxed text-ink-soft">{note}</p>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-soft">{children}</p>;
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'error' | 'ok'; children: React.ReactNode }) {
  const cls =
    tone === 'error'
      ? 'border-err-ink/20 bg-err-bg text-err-ink'
      : tone === 'ok'
        ? 'border-ok-ink/20 bg-ok-bg text-ok-ink'
        : 'border-line bg-sand text-ink';
  return <p className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}

/** A plain, scrollable table — wide finance tables stay usable on a phone. */
export function Table({ head, rows, align }: { head: string[]; rows: React.ReactNode[][]; align?: ('left' | 'right')[] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-[0.12em] text-ink-soft">
            {head.map((h, i) => (
              <th key={h} className={`py-2 pr-4 font-bold ${align?.[i] === 'right' ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line/70 last:border-0">
              {r.map((c, ci) => (
                <td key={ci} className={`py-2.5 pr-4 align-top text-ink ${align?.[ci] === 'right' ? 'whitespace-nowrap text-right tabular-nums' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TripLink({ base, ref_ }: { base: string; ref_: string }) {
  return (
    <Link href={`${base}/trips/${ref_}`} className="font-semibold text-teal-deep hover:underline">
      {ref_}
    </Link>
  );
}
