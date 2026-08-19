'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  deleteStTeacher,
  inviteStTeacher,
  resendStTeacherInvite,
  setStTeacherStatus,
} from '@/lib/admin/st-teacher-actions';

export type TeacherRow = {
  id: number;
  name: string;
  email: string;
  schoolName: string;
  status: 'invited' | 'active' | 'disabled';
  invitedAt: string;
  acceptedAt: string | null;
  lastSeenAt: string | null;
  quoteCount: number;
};

const date = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

const STATUS_STYLE: Record<TeacherRow['status'], string> = {
  active: 'bg-teal/15 text-teal-deep',
  invited: 'bg-ink/10 text-ink-soft',
  disabled: 'bg-danger/10 text-danger',
};

export default function StTeachersManager({ rows }: { rows: TeacherRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [busy, setBusy] = useState<number | 'invite' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy('invite');
    setError(null);
    setLink(null);
    const res = await inviteStTeacher({ name, email, schoolName: school });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setLink({ email: email.trim().toLowerCase(), url: res.link! });
    setName('');
    setEmail('');
    setSchool('');
    router.refresh();
  }

  async function onResend(id: number, teacherEmail: string) {
    setBusy(id);
    setError(null);
    setLink(null);
    const res = await resendStTeacherInvite(id);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setLink({ email: teacherEmail, url: res.link! });
  }

  async function act(id: number, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(id);
    setError(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Something went wrong.');
    else router.refresh();
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const mailto = (to: string, url: string) =>
    `mailto:${to}?subject=${encodeURIComponent('Your Premium Choice School Trips portal')}&body=${encodeURIComponent(
      `Hello,\n\nHere is your link to set a password and see your quotes:\n\n${url}\n\nThe link can only be used once.\n\nPremium Choice School Trips`
    )}`;

  return (
    <>
      <form onSubmit={onInvite} className="card mt-8 grid gap-4 p-6">
        <p className="eyebrow">Invite a teacher</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label>
            <span className="field-label">Name</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Rania Ahmed" />
          </label>
          <label>
            <span className="field-label">Email</span>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="r.ahmed@school.ae" />
          </label>
          <label>
            <span className="field-label">School</span>
            <input className="field" value={school} onChange={(e) => setSchool(e.target.value)} required placeholder="Sunmarke School" />
          </label>
        </div>
        <button className="btn-primary !py-2.5 justify-self-start" disabled={busy !== null}>
          {busy === 'invite' ? 'Creating invite…' : 'Create invite link'}
        </button>
        <p className="text-xs text-ink-soft">
          The quote&apos;s <em>teacher email</em> must match this address for it to appear in their portal.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      {link && (
        <div className="mt-6 rounded-2xl border border-teal bg-teal/[.06] p-5">
          <p className="text-sm font-semibold text-ink">Invite link for {link.email} — send this to them</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              readOnly
              className="field min-w-[260px] flex-1 font-mono text-xs"
              value={link.url}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="btn-outline !bg-white !py-2.5" onClick={() => copy(link.url)}>
              {copied ? 'Copied ✓' : 'Copy link'}
            </button>
            <a className="btn-outline !bg-white !py-2.5" href={mailto(link.email, link.url)}>
              Open in email
            </a>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            Single use, and it expires. If they miss it, use Send new link below.
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="card mt-8 p-10 text-center text-sm text-ink-soft">No teachers invited yet.</p>
      ) : (
        <div className="card mt-8 divide-y divide-line">
          {rows.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[180px] flex-1">
                <p className="font-semibold text-ink">{t.name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {t.email} · {t.schoolName}
                </p>
              </div>

              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[t.status]}`}>
                {t.status}
              </span>

              <span className="text-xs text-ink-soft">
                {t.quoteCount || '—'} quote{t.quoteCount === 1 ? '' : 's'}
              </span>
              <span className="hidden text-xs text-ink-soft sm:block">seen {date(t.lastSeenAt)}</span>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  className="text-xs font-semibold text-teal-deep hover:underline disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => onResend(t.id, t.email)}
                >
                  {busy === t.id ? '…' : 'Send new link'}
                </button>
                <button
                  className="text-xs font-semibold text-ink-soft hover:text-teal-deep disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => act(t.id, () => setStTeacherStatus(t.id, t.status === 'disabled' ? 'active' : 'disabled'))}
                >
                  {t.status === 'disabled' ? 'Enable' : 'Disable'}
                </button>
                <button
                  className="text-xs font-semibold text-ink-soft hover:text-danger disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => {
                    if (window.confirm(`Remove ${t.name} and their login?`)) act(t.id, () => deleteStTeacher(t.id));
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
