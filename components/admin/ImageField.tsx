'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

/**
 * Shrink a photo in the browser before it is sent.
 *
 * Vercel rejects any serverless request body over 4.5MB, and a phone photo is
 * routinely larger than that. Resizing here keeps uploads well under the limit
 * and gives the site web-sized images rather than 12-megapixel originals.
 */
async function compressImage(file: File, maxEdge = 2000, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // unsupported by this browser — let the server decide

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  // Already small enough, and not a heavyweight format worth re-encoding.
  if (scale === 1 && file.size <= 3 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  if (!blob || blob.size >= file.size) return file; // no gain, keep the original

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

async function uploadFile(file: File): Promise<string> {
  const prepared = await compressImage(file);

  const fd = new FormData();
  fd.append('file', prepared);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });

  // A rejected upload comes back as plain text, not JSON — read it as text
  // first so the user sees the reason rather than a parser error.
  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    if (res.status === 413) {
      throw new Error(
        `“${file.name}” is too large to upload even after resizing. Save it at a smaller size and try again.`
      );
    }
    throw new Error(`Upload failed (${res.status}). ${raw.slice(0, 120)}`);
  }

  if (!json.ok) throw new Error(json.error || 'Upload failed');
  return json.url as string;
}

/** Single image: upload from computer (or paste a URL as fallback). */
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadFile(file));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-line bg-sand">
          {value ? (
            <Image src={value} alt="" fill sizes="144px" className="object-cover" unoptimized={value.startsWith('blob:')} />
          ) : (
            <span className="flex h-full items-center justify-center text-[11px] text-ink-soft">No image</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="btn-outline !px-4 !py-2 text-xs disabled:opacity-50"
            >
              {busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="rounded-full px-3 py-2 text-xs font-semibold text-danger hover:bg-sand">
                Remove
              </button>
            )}
          </div>
          <input
            className="field !py-2 text-xs"
            placeholder="…or paste an image URL"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** Multi-image gallery with upload, reorder and remove. */
export function GalleryField({
  label,
  images,
  onChange,
}: {
  label: string;
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    setError(null);

    // Upload one at a time and keep whatever succeeds: losing four good
    // images because the fifth was oversized would mean starting over.
    const urls: string[] = [];
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      try {
        urls.push(await uploadFile(file));
      } catch (e: any) {
        failures.push(e.message);
      }
    }

    if (urls.length) onChange([...images, ...urls]);
    if (failures.length) setError(failures.join(' '));
    setBusy(false);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={`${src}-${i}`} className="group relative h-24 w-36 overflow-hidden rounded-xl border border-line bg-sand">
            <Image src={src} alt="" fill sizes="144px" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink/70 py-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" onClick={() => move(i, -1)} className="px-1.5 text-xs text-white" aria-label="Move left">←</button>
              <button type="button" onClick={() => move(i, 1)} className="px-1.5 text-xs text-white" aria-label="Move right">→</button>
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="px-1.5 text-xs text-white hover:text-danger"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex h-24 w-36 items-center justify-center rounded-xl border-2 border-dashed border-line text-xs font-semibold text-ink-soft transition-colors hover:border-teal hover:text-teal-deep disabled:opacity-50"
        >
          {busy ? 'Uploading…' : '+ Add images'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
