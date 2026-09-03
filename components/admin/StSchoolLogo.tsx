'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { compressImage } from '@/lib/compress-image';
import {
  deleteStProposalImage,
  updateStProposalContent,
  uploadStProposalImage,
} from '@/lib/admin/st-proposal-actions';

/**
 * The school's logo.
 *
 * Shown on the online hero above "Proposal prepared for", and on the cover of
 * the PDF. It is stored as one of the proposal's own images, tagged so it
 * stays out of the photograph pickers, and the content document records
 * which image it is.
 *
 * A PNG with a transparent background is kept as PNG; only a large JPG is
 * resized. An SVG passes through untouched.
 */
export default function StSchoolLogo({
  proposalId,
  logo,
  scoped,
}: {
  proposalId: number;
  logo: { id: number; url: string } | null;
  /** False until the photographs migration has run. */
  scoped: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await compressImage(file, 1200);
      const fd = new FormData();
      fd.append('proposalId', String(proposalId));
      fd.append('file', prepared);
      fd.append('alt', 'School logo');
      fd.append('tag', 'logo');
      const res = await uploadStProposalImage(null, fd);
      if (!res?.ok) throw new Error(res?.error ?? 'Upload failed');
      const saved = await updateStProposalContent(proposalId, { schoolLogoImageId: res.id });
      if (!saved.ok) throw new Error(saved.error);
      // The one it replaces is not needed any more.
      if (logo) await deleteStProposalImage(proposalId, logo.id);
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function remove() {
    if (!logo || !confirm('Remove the school logo from this proposal?')) return;
    setBusy(true);
    setError(null);
    const cleared = await updateStProposalContent(proposalId, { schoolLogoImageId: null });
    if (!cleared.ok) setError(cleared.error);
    else {
      await deleteStProposalImage(proposalId, logo.id);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <section className="card p-6">
      <h2 className="font-serif text-xl text-ink">School logo</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Shown above &ldquo;Proposal prepared for&rdquo; on the page, and on the cover of the
        PDF. A PNG with a transparent background looks best.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-5">
        {logo ? (
          <div className="rounded-lg border border-line bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.url} alt="School logo" className="h-16 w-auto max-w-[220px] object-contain" />
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No logo yet.</p>
        )}
        <div className="grid gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={onPick}
            disabled={busy || !scoped}
            className="field !py-2"
          />
          {logo && (
            <button className="text-left text-sm font-semibold text-danger hover:underline" disabled={busy} onClick={remove}>
              Remove logo
            </button>
          )}
        </div>
      </div>

      {!scoped && (
        <p className="mt-3 text-sm text-ink-soft">
          Run the photographs migration first (see the Photos tab).
        </p>
      )}
      {busy && <p className="mt-3 text-sm text-ink-soft">Working…</p>}
      {error && <p className="mt-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
