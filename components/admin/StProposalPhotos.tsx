'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { compressImage } from '@/lib/compress-image';
import {
  deleteStProposalImage,
  updateStProposalImageAlt,
  uploadStProposalImage,
} from '@/lib/admin/st-proposal-actions';

/**
 * The photographs of one proposal.
 *
 * They are uploaded here and nowhere else, and they belong to this proposal
 * alone: the hero picker, each day's pictures, the signature experiences and
 * the custom pages all choose from this set. A new proposal starts with none.
 *
 * Files are shrunk in the browser first — a phone photograph is routinely
 * larger than the platform will carry in one request.
 */

type Photo = { id: number; alt: string; url: string };

export default function StProposalPhotos({
  proposalId,
  images,
  scoped,
}: {
  proposalId: number;
  images: Photo[];
  /** False until the images migration has been run. */
  scoped: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alts, setAlts] = useState<Record<number, string>>(
    Object.fromEntries(images.map((i) => [i.id, i.alt])),
  );
  const [busy, setBusy] = useState<number | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError(null);
    let done = 0;
    for (const file of files) {
      setProgress(`Uploading ${done + 1} of ${files.length}: ${file.name}`);
      try {
        const prepared = await compressImage(file);
        const dims = await createImageBitmap(prepared)
          .then((b) => {
            const d = { width: b.width, height: b.height };
            b.close();
            return d;
          })
          .catch(() => null);

        const fd = new FormData();
        fd.append('proposalId', String(proposalId));
        fd.append('file', prepared);
        // A caption to start with; it can be edited below.
        fd.append('alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        if (dims) {
          fd.append('width', String(dims.width));
          fd.append('height', String(dims.height));
        }
        const res = await uploadStProposalImage(null, fd);
        if (!res?.ok) throw new Error(res?.error ?? 'Upload failed');
        done += 1;
      } catch (err: any) {
        setError(`${file.name}: ${err?.message ?? 'upload failed'}`);
        break;
      }
    }
    setProgress(null);
    if (fileInput.current) fileInput.current.value = '';
    if (done > 0) router.refresh();
  }

  async function saveAlt(id: number) {
    setBusy(id);
    const res = await updateStProposalImageAlt(proposalId, id, alts[id] ?? '');
    setBusy(null);
    if (!res.ok) setError(res.error);
  }

  async function remove(photo: Photo) {
    if (!confirm(`Delete this photograph? Anywhere it is used in the proposal will show without it.`)) return;
    setBusy(photo.id);
    const res = await deleteStProposalImage(proposalId, photo.id);
    setBusy(null);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Photographs for this proposal</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Only these appear in the hero, day and page pickers. JPG, PNG or WebP; large
          files are resized here before they are sent.
        </p>

        {!scoped && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-ink">
            The photographs migration has not been run yet, so this proposal is still
            showing the shared library. Run{' '}
            <code className="rounded bg-white px-1">supabase/migrations/20260903000000_brochure_images_owner.sql</code>{' '}
            in the School Trips SQL editor, then reload.
          </p>
        )}

        <div className="mt-4">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={onPick}
            disabled={progress !== null || !scoped}
            className="field !py-2"
          />
          {progress && <p className="mt-2 text-sm text-ink-soft">{progress}</p>}
          {error && (
            <p className="mt-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          )}
        </div>
      </section>

      {images.length === 0 ? (
        <p className="text-sm text-ink-soft">No photographs yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((photo) => (
            <div className="card overflow-hidden" key={photo.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.alt} className="aspect-[4/3] w-full object-cover" />
              <div className="p-4">
                <label className="field-label">Caption</label>
                <input
                  className="field"
                  value={alts[photo.id] ?? ''}
                  onChange={(e) => setAlts((a) => ({ ...a, [photo.id]: e.target.value }))}
                  onBlur={() => alts[photo.id] !== photo.alt && saveAlt(photo.id)}
                />
                <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
                  <span>Image {photo.id}</span>
                  <button
                    className="font-semibold text-danger hover:underline"
                    disabled={busy === photo.id}
                    onClick={() => remove(photo)}
                  >
                    {busy === photo.id ? 'Working…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
