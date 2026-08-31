'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { uploadTo } from '@/lib/compress-image';
import ShutterstockPicker from '@/components/admin/ShutterstockPicker';

const uploadFile = (file: File) => uploadTo('/api/admin/upload', file);

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
  const [stockOpen, setStockOpen] = useState(false);

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
            <button
              type="button"
              onClick={() => setStockOpen(true)}
              className="btn-outline !px-4 !py-2 text-xs"
            >
              Search Shutterstock
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
      {stockOpen && <ShutterstockPicker onPick={onChange} onClose={() => setStockOpen(false)} />}
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
  const [stockOpen, setStockOpen] = useState(false);

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
              <button type="button" onClick={() => move(i, -1)} className="px-1.5 text-xs text-white" aria-label="Move left">â†</button>
              <button type="button" onClick={() => move(i, 1)} className="px-1.5 text-xs text-white" aria-label="Move right">â†’</button>
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="px-1.5 text-xs text-white hover:text-danger"
                aria-label="Remove"
              >
                âœ•
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
        <button
          type="button"
          onClick={() => setStockOpen(true)}
          className="flex h-24 w-36 items-center justify-center rounded-xl border-2 border-dashed border-line text-xs font-semibold text-ink-soft transition-colors hover:border-teal hover:text-teal-deep"
        >
          Search Shutterstock
        </button>
      </div>
      {stockOpen && (
        <ShutterstockPicker onPick={(url) => onChange([...images, url])} onClose={() => setStockOpen(false)} />
      )}
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
