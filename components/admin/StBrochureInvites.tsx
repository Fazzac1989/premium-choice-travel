'use client';

import { useRef, useState } from 'react';
import { compressImage } from '@/lib/compress-image';
import {
  createStBrochureInvite,
  deleteStBrochureInvite,
  sendStBrochureInvite,
} from '@/lib/admin/st-brochure-actions';
import { uploadStProposalImage } from '@/lib/admin/st-proposal-actions';
import type { Brochure } from '@/lib/brochure/schema';

/**
 * Send the brochure to a teacher.
 *
 * Each teacher gets their own link: a page with their name, their school's
 * logo, a message from us, and a button into the brochure. The link also
 * opens a password-protected brochure without the password. We can see when
 * each was opened.
 */

export type InviteRow = {
  id: number;
  token: string;
  teacherName: string;
  schoolName: string;
  email: string | null;
  message: string;
  logoUrl: string | null;
  openCount: number;
  firstOpenedAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

export default function StBrochureInvites({
  brochure,
  invites,
  siteUrl,
  run,
  busy,
}: {
  brochure: Brochure;
  invites: InviteRow[];
  siteUrl: string;
  run: (k: string, f: () => Promise<any>, s?: string) => Promise<any>;
  busy: string | null;
}) {
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState(brochure.clientName ?? '');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  const link = (token: string) => `${siteUrl}/b/${token}`;

  async function create() {
    setLogoError(null);
    const file = logoInput.current?.files?.[0] ?? null;
    let logoImageId: number | null = null;
    if (file) {
      const fd = new FormData();
      fd.append('proposalId', String(brochure.id));
      fd.append('file', await compressImage(file, 1200));
      fd.append('alt', `${schoolName || teacherName} logo`);
      fd.append('tag', 'logo');
      const up = await uploadStProposalImage(null, fd);
      if (!up?.ok) {
        setLogoError(up?.error ?? 'The logo could not be uploaded.');
        return;
      }
      logoImageId = up.id;
    }
    await run(
      'invite',
      () => createStBrochureInvite(brochure.id, { teacherName, schoolName, email, message, logoImageId }),
      'Link created.',
    );
    setTeacherName('');
    setEmail('');
    setMessage('');
    if (logoInput.current) logoInput.current.value = '';
  }

  async function copy(inv: InviteRow) {
    await navigator.clipboard.writeText(link(inv.token));
    setCopied(inv.id);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="mt-6 grid gap-8">
      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Send it to a teacher</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Each teacher gets their own page — their name, their school&apos;s logo, your message
          and a button into the brochure — at a link only they have. If the brochure has a
          password, their link opens it without one.
        </p>
        {brochure.status !== 'published' && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-ink">
            The brochure is not published yet. Links can be made now, but the page will say
            &ldquo;not quite ready&rdquo; until it is.
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Teacher&apos;s name *</label>
            <input className="field" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="e.g. Sarah Ahmed" />
          </div>
          <div>
            <label className="field-label">School</label>
            <input className="field" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Email (to send the link)</label>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
          </div>
          <div>
            <label className="field-label">School logo (optional)</label>
            <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="field !py-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Your message</label>
            <textarea
              className="field min-h-[140px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A few lines to the teacher. Leave a blank line between paragraphs. If left empty, a standard greeting is shown."
            />
          </div>
        </div>
        {logoError && <p className="mt-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{logoError}</p>}
        <button
          className="btn-primary mt-5 !py-2.5"
          disabled={busy !== null || !teacherName.trim()}
          onClick={create}
        >
          {busy === 'invite' ? 'Creating…' : 'Create the link'}
        </button>
      </section>

      <section>
        <h2 className="font-serif text-xl text-ink">Teachers this brochure has gone to</h2>
        {invites.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nobody yet.</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {invites.map((inv) => (
              <div className="card p-4" key={inv.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {inv.logoUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={inv.logoUrl} alt="" className="h-10 w-auto max-w-[120px] rounded bg-white object-contain" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {inv.teacherName}
                        {inv.schoolName && <span className="font-normal text-ink-soft"> · {inv.schoolName}</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {inv.openCount > 0
                          ? `Opened ${inv.openCount} time${inv.openCount === 1 ? '' : 's'} · first ${when(inv.firstOpenedAt)}`
                          : 'Not opened yet'}
                        {inv.sentAt ? ` · emailed ${when(inv.sentAt)}` : ''}
                        {inv.email && !inv.sentAt ? ` · ${inv.email}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <a href={link(inv.token)} target="_blank" rel="noreferrer" className="text-teal-deep hover:underline">
                      Open ↗
                    </a>
                    <button className="text-teal-deep hover:underline" onClick={() => copy(inv)}>
                      {copied === inv.id ? 'Copied' : 'Copy link'}
                    </button>
                    {inv.email && (
                      <button
                        className="text-teal-deep hover:underline disabled:opacity-50"
                        disabled={busy !== null}
                        onClick={() => run(`send-${inv.id}`, () => sendStBrochureInvite(inv.id), `Emailed to ${inv.email}.`)}
                      >
                        {busy === `send-${inv.id}` ? 'Sending…' : inv.sentAt ? 'Email again' : 'Email the link'}
                      </button>
                    )}
                    <button
                      className="text-danger hover:underline disabled:opacity-50"
                      disabled={busy !== null}
                      onClick={() => {
                        if (confirm(`Delete ${inv.teacherName}'s link? It will stop working.`))
                          run(`del-${inv.id}`, () => deleteStBrochureInvite(inv.id), 'Link deleted.');
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <code className="mt-3 block truncate rounded-lg bg-sand px-3 py-2 text-xs">{link(inv.token)}</code>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
