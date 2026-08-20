'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { generateStCountryPage } from '@/lib/admin/st-country-page-actions';

export type CountryPageRow = {
  id: number;
  name: string;
  slug: string;
  tripCount: number;
  hasContent: boolean;
  heroCount: number;
  galleryCount: number;
  contentUpdatedAt: string | null;
};

/**
 * The country page builder: editorial content plus photography, one click per
 * country. Runs for a minute or two per country — content first, then six
 * image roles found, judged and downloaded.
 */
export default function StCountryPages({ rows, siteUrl }: { rows: CountryPageRow[]; siteUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const incomplete = rows.filter((r) => !r.hasContent || !r.heroCount || r.galleryCount < 4);

  async function generate(row: CountryPageRow) {
    setBusy(row.id);
    setError(null);
    setDone(null);
    const res = await generateStCountryPage(row.id);
    setBusy(null);
    if (!res.ok) return setError(`${row.name}: ${res.error}`);
    setDone(
      `${row.name}: content written, ${res.images} image${res.images === 1 ? '' : 's'} placed.` +
        (res.missed.length ? ` No suitable photo for: ${res.missed.join('; ')}.` : '')
    );
    router.refresh();
  }

  return (
    <section className="mt-14 border-t border-line pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-ink">Country pages</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            The public destination page: introduction, education notes, curriculum links, seasons,
            safety, useful phrases and its own photography. Generating replaces what is there, takes
            a minute or two, and the result is editable afterwards — always read it before relying
            on it.
          </p>
        </div>
        {incomplete.length > 0 && (
          <span className="text-sm font-semibold text-ink">
            {incomplete.length} of {rows.length} incomplete
          </span>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {done && <p className="mt-4 text-sm font-semibold text-teal-deep">{done}</p>}

      <div className="card mt-6 divide-y divide-line">
        {rows.map((row) => {
          const complete = row.hasContent && row.heroCount > 0 && row.galleryCount >= 4;
          return (
            <div key={row.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[160px] flex-1">
                <p className="font-semibold text-ink">{row.name}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {row.tripCount} trip{row.tripCount === 1 ? '' : 's'} ·{' '}
                  {row.hasContent
                    ? `content ${row.contentUpdatedAt ? `from ${new Date(row.contentUpdatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'written'}`
                    : 'no content'}{' '}
                  · {row.heroCount ? 'hero' : 'NO HERO'} · {row.galleryCount} gallery
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  complete ? 'bg-teal/15 text-teal-deep' : 'bg-danger/10 text-danger'
                }`}
              >
                {complete ? 'complete' : 'incomplete'}
              </span>

              <a
                href={`${siteUrl}/countries/${row.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-deep hover:underline"
              >
                View ↗
              </a>
              <button
                className="text-xs font-semibold text-ink-soft hover:text-teal-deep disabled:opacity-50"
                disabled={busy !== null}
                onClick={() => {
                  if (
                    !row.hasContent ||
                    window.confirm(`Regenerate ${row.name}? The current content and photography will be replaced.`)
                  ) {
                    generate(row);
                  }
                }}
              >
                {busy === row.id ? 'Generating…' : row.hasContent ? 'Regenerate' : 'Generate page'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
