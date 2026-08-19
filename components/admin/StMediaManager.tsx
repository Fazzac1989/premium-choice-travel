'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteStMediaObject } from '@/lib/admin/st-misc-actions';
import { uploadTo } from '@/lib/compress-image';

export type MediaItem = { name: string; url: string; size: number; createdAt: string | null };

export default function StMediaManager({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function onUpload(files: FileList) {
    setUploading(true);
    setError(null);

    // Keep whatever succeeds rather than losing a whole selection to one bad file.
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      try {
        await uploadTo('/api/admin/st-upload', file);
      } catch (e: any) {
        failures.push(e.message);
      }
    }

    setUploading(false);
    if (failures.length) setError(failures.join(' '));
    router.refresh();
  }

  async function onDelete(item: MediaItem) {
    if (!window.confirm(`Delete ${item.name}? Any trip using it will lose its image.`)) return;
    setError(null);
    const res = await deleteStMediaObject(item.name);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  function copy(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-soft">
          trip-images bucket · {items.length} file{items.length === 1 ? '' : 's'}
          {items.length === 200 && ' (newest 200)'}
        </p>
        <label className="btn-primary !py-2.5 cursor-pointer">
          {uploading ? 'Uploading…' : 'Upload images'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) onUpload(files);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {items.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-sm text-ink-soft">
          No images yet — upload hero and gallery photography here.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.name} className="card">
              <div className="aspect-[4/3] bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element -- storage-hosted admin thumbnails */}
                <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-3 text-xs">
                <p className="truncate font-semibold text-ink" title={item.name}>
                  {item.name}
                </p>
                <p className="mt-0.5 text-ink-soft">{(item.size / 1024).toFixed(0)} KB</p>
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => copy(item.url)}
                    className="font-semibold text-teal-deep hover:underline"
                  >
                    {copied === item.url ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="font-semibold text-ink-soft hover:text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
