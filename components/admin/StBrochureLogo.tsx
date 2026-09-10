'use client';

import { useRef, useState } from 'react';
import { compressImage } from '@/lib/compress-image';
import { updateStBrochure } from '@/lib/admin/st-brochure-actions';
import { uploadStProposalImage } from '@/lib/admin/st-proposal-actions';

/**
 * The school's logo for one brochure.
 *
 * It appears on the cover and at the foot of every other page, so it lives
 * beside the cover in the running order rather than buried in Settings —
 * the first place someone looks when they want it on the front page.
 */
export default function StBrochureLogo({
  brochureId,
  clientLogo,
  clientName,
  title,
  run,
  busy,
}: {
  brochureId: number;
  clientLogo: string | null;
  clientName: string | null;
  title: string;
  run: (key: string, fn: () => Promise<any>, success?: string) => any;
  busy: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('proposalId', String(brochureId));
      fd.append('file', await compressImage(file, 1200));
      fd.append('alt', `${clientName || title} logo`);
      // Tagged so it stays out of the photograph pickers.
      fd.append('tag', 'logo');
      const up = await uploadStProposalImage(null, fd);
      if (!up?.ok) throw new Error(up?.error ?? 'The logo could not be uploaded.');
      await run('logo', () => updateStBrochure(brochureId, { clientLogo: up.url }), 'Logo saved.');
    } catch (err: any) {
      setError(err?.message ?? 'The logo could not be uploaded.');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      <span className="w-8 text-right text-xs tabular-nums text-ink-soft">—</span>
      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-semibold text-ink">School logo</p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {clientLogo
            ? 'On the cover, and at the foot of every other page.'
            : 'Not set — the cover and page corners have no school mark. A PNG with a transparent background looks best.'}
        </p>
      </div>

      {clientLogo && (
        <span className="rounded-lg border border-line bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={clientLogo} alt="School logo" className="h-10 w-auto max-w-[160px] object-contain" />
        </span>
      )}

      <div className="flex items-center gap-3 text-xs font-semibold">
        <label className={`cursor-pointer text-teal-deep hover:underline ${uploading || busy ? 'opacity-50' : ''}`}>
          {uploading ? 'Uploading…' : clientLogo ? 'Replace' : 'Upload a logo'}
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={upload}
            disabled={uploading || busy !== null}
            className="hidden"
          />
        </label>
        {clientLogo && (
          <button
            className="text-danger hover:underline disabled:opacity-50"
            disabled={uploading || busy !== null}
            onClick={() => run('logo', () => updateStBrochure(brochureId, { clientLogo: null }), 'Logo removed.')}
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="w-full rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
