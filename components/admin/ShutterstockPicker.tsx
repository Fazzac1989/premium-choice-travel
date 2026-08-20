'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from 'react';
import {
  shutterstockLicense,
  shutterstockSearch,
  type StockResult,
} from '@/lib/admin/shutterstock-actions';

/**
 * Search-and-license modal for the admin image fields. Previews are
 * Shutterstock's own watermarked thumbnails; picking one licenses it via the
 * account's API plan and stores the clean file in our media library.
 */
export default function ShutterstockPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState('');
  const [licensing, setLicensing] = useState('');
  const [fallback, setFallback] = useState<{ pageUrl: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const search = (p = 1) =>
    startTransition(async () => {
      setError('');
      setFallback(null);
      const res = await shutterstockSearch(query, p);
      if (res.ok) {
        setResults(res.results);
        setPage(res.page);
        setTotalPages(res.totalPages);
        if (!res.results.length) setError('No results — try different words.');
      } else {
        setError(res.error);
      }
    });

  const pick = (r: StockResult) =>
    startTransition(async () => {
      setError('');
      setFallback(null);
      setLicensing(r.id);
      const res = await shutterstockLicense(r.id);
      setLicensing('');
      if (res.ok) {
        onPick(res.url);
        onClose();
      } else if (res.licenseUnavailable && res.pageUrl) {
        setFallback({ pageUrl: res.pageUrl, message: res.error });
      } else {
        setError(res.error);
      }
    });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85svh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line p-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                search(1);
              }
            }}
            placeholder="Search Shutterstock — e.g. students museum london"
            className="field flex-1 !py-2.5"
          />
          <button type="button" onClick={() => search(1)} disabled={pending} className="btn-primary !px-5 !py-2.5 disabled:opacity-50">
            {pending && !licensing ? 'Searching…' : 'Search'}
          </button>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-sand">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}
          {fallback && (
            <div className="mb-3 rounded-xl border border-line bg-sand p-4 text-sm">
              <p className="text-ink">{fallback.message}</p>
              <a href={fallback.pageUrl} target="_blank" rel="noopener" className="mt-2 inline-block font-bold text-teal-deep hover:underline">
                Open this image on Shutterstock ↗
              </a>
            </div>
          )}
          {results.length === 0 && !error && (
            <p className="py-16 text-center text-sm text-ink-soft">
              Search Shutterstock’s library — picking an image licenses it on your plan
              and files the clean copy straight into your media library.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={pending}
                onClick={() => pick(r)}
                className="group relative aspect-[3/2] overflow-hidden rounded-lg border border-line bg-sand text-left disabled:opacity-60"
                title={r.description}
              >
                <img src={r.thumb} alt={r.description} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-ink/70 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {licensing === r.id ? 'Licensing…' : 'Click to license & use'}
                </span>
              </button>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button type="button" disabled={pending || page <= 1} onClick={() => search(page - 1)} className="btn-outline !px-4 !py-1.5 text-xs disabled:opacity-40">
                ← Previous
              </button>
              <span className="text-ink-soft">Page {page} of {totalPages}</span>
              <button type="button" disabled={pending || page >= totalPages} onClick={() => search(page + 1)} className="btn-outline !px-4 !py-1.5 text-xs disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </div>
        <p className="border-t border-line px-4 py-2 text-center text-[11px] text-ink-soft">
          Previews are watermarked; the licensed file is stored in your own media library with the licence on your Shutterstock account.
        </p>
      </div>
    </div>
  );
}
