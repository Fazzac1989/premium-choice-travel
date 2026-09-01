'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createStProposal } from '@/lib/admin/st-proposal-actions';

type Row = {
  id: number;
  title: string;
  preparedFor: string;
  status: string;
  travelStart: string | null;
  travelEnd: string | null;
  pricePerStudent: number | null;
  currency: string;
  studentCount: number | null;
  hasLink: boolean;
  shareExpiresAt: string | null;
  viewCount: number;
  updatedAt: string | null;
  days: number;
};

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-ink/10 text-ink-soft',
  sent: 'bg-teal/15 text-teal-deep',
  viewed: 'bg-teal/25 text-teal-deep',
  accepted: 'bg-teal text-white',
  expired: 'bg-danger/10 text-danger',
};

export default function StProposalList({ proposals }: { proposals: Row[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [preparedFor, setPreparedFor] = useState('');
  const [copyFromId, setCopyFromId] = useState<string>('');

  async function create() {
    setBusy(true);
    setError(null);
    const res = await createStProposal({
      title,
      preparedFor,
      copyFromId: copyFromId ? Number(copyFromId) : null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/admin/school-trips/proposals/${res.id}`);
  }

  return (
    <>
      <div className="mt-6 flex justify-end">
        <button className="btn-primary !py-2.5" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : 'New proposal'}
        </button>
      </div>

      {creating && (
        <div className="card mt-4 p-6">
          <h2 className="font-serif text-xl text-ink">New proposal</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Title</span>
              <input
                className="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Finland Winter Activity Adventure"
              />
            </label>
            <label className="block">
              <span className="field-label">Prepared for</span>
              <input
                className="field"
                value={preparedFor}
                onChange={(e) => setPreparedFor(e.target.value)}
                placeholder="Dubai College"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="field-label">Start from an existing proposal</span>
            <select className="field" value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)}>
              <option value="">Start blank</option>
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {p.preparedFor ? `· ${p.preparedFor}` : ''}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-ink-soft">
              Copies the wording, itinerary and flights. Prices and dates start empty, so last
              term&rsquo;s figures cannot reach a new school by accident.
            </span>
          </label>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <div className="mt-5 flex gap-3">
            <button className="btn-primary !py-2.5" disabled={busy || !title.trim()} onClick={create}>
              {busy ? 'Creating…' : 'Create proposal'}
            </button>
          </div>
        </div>
      )}

      {proposals.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-sm text-ink-soft">
          No proposals yet. Create one to get started.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {proposals.map((p) => (
            <Link
              key={p.id}
              href={`/admin/school-trips/proposals/${p.id}`}
              className="card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:shadow-md"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      STATUS_STYLE[p.status] ?? 'bg-ink/10 text-ink-soft'
                    }`}
                  >
                    {p.status}
                  </span>
                  {p.hasLink && <span className="text-xs text-ink-soft">Link live</span>}
                  {expired(p.shareExpiresAt) && (
                    <span className="text-xs font-semibold text-danger">Link expired</span>
                  )}
                </div>
                <p className="mt-1.5 truncate font-serif text-lg text-ink">{p.title}</p>
                <p className="text-sm text-ink-soft">
                  {p.preparedFor || 'No school yet'}
                  {p.days ? ` · ${p.days} days` : ''}
                  {p.travelStart ? ` · ${dates(p.travelStart, p.travelEnd)}` : ''}
                </p>
              </div>

              <div className="text-right text-sm">
                <p className="font-semibold text-ink">
                  {p.pricePerStudent
                    ? `${p.currency} ${Number(p.pricePerStudent).toLocaleString()}`
                    : 'No price'}
                </p>
                <p className="text-ink-soft">
                  {p.studentCount ? `${p.studentCount} students` : 'No group size'}
                  {p.viewCount ? ` · ${p.viewCount} views` : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function expired(iso: string | null) {
  return Boolean(iso && new Date(iso).getTime() < Date.now());
}

function dates(start: string, end: string | null) {
  const f = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'short',
    });
  return end ? `${f(start)} – ${f(end)}` : f(start);
}
