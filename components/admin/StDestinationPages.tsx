'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { generateStCountryPage, generateStCityPage } from '@/lib/admin/st-country-page-actions';
import { saveStDestinationImages, type DestinationKind } from '@/lib/admin/st-destination-actions';
import { GalleryField, ImageField } from '@/components/admin/ImageField';

export type DestinationRow = {
  id: number;
  name: string;
  slug: string;
  tripCount: number;
  hasContent: boolean;
  heroImage: string | null;
  heroAlt: string | null;
  gallery: string[];
  contentUpdatedAt: string | null;
};

/**
 * Destination pages: the editorial content, and the photography that goes with
 * it. Both countries and cities use this — the only differences are the label
 * and which generator runs.
 */
export default function StDestinationPages({
  kind,
  rows,
  siteUrl,
}: {
  kind: DestinationKind;
  rows: DestinationRow[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [openImages, setOpenImages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const label = kind === 'city' ? 'City' : 'Country';
  const path = kind === 'city' ? 'cities' : 'countries';
  const incomplete = rows.filter((r) => !r.hasContent || !r.heroImage);

  async function generate(row: DestinationRow) {
    setBusy(row.id);
    setError(null);
    setDone(null);
    const res = kind === 'city' ? await generateStCityPage(row.id) : await generateStCountryPage(row.id);
    setBusy(null);
    if (!res.ok) return setError(`${row.name}: ${res.error}`);
    setDone(`${row.name}: content written. Read it before relying on it.`);
    router.refresh();
  }

  return (
    <section className="mt-14 border-t border-line pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-ink">{label} pages</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-soft">
            The public destination page: introduction, education notes, curriculum links, seasons,
            {kind === 'city' ? ' getting around' : ' safety and getting there'} and useful phrases.
            Generating replaces the written content and is editable afterwards — always read it
            before relying on it. Photography is uploaded here and is exactly what the page shows.
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
          const complete = row.hasContent && Boolean(row.heroImage);
          return (
            <div key={row.id}>
              <div className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[160px] flex-1">
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {row.tripCount} trip{row.tripCount === 1 ? '' : 's'} ·{' '}
                    {row.hasContent
                      ? `content ${row.contentUpdatedAt ? `from ${new Date(row.contentUpdatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : 'written'}`
                      : 'no content'}{' '}
                    · {row.heroImage ? 'hero' : 'NO HERO'} · {row.gallery.length} gallery
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    complete ? 'bg-teal/15 text-teal-deep' : 'bg-danger/10 text-danger'
                  }`}
                >
                  {complete ? 'complete' : 'incomplete'}
                </span>

                <button
                  className="text-xs font-semibold text-ink-soft hover:text-teal-deep"
                  onClick={() => setOpenImages(openImages === row.id ? null : row.id)}
                >
                  {openImages === row.id ? 'Close images' : 'Images'}
                </button>
                <a
                  href={`${siteUrl}/${path}/${row.slug}`}
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
                      window.confirm(`Regenerate ${row.name}? The written content will be replaced. Photography is not touched.`)
                    ) {
                      generate(row);
                    }
                  }}
                >
                  {busy === row.id ? 'Generating…' : row.hasContent ? 'Regenerate' : 'Generate page'}
                </button>
              </div>

              {openImages === row.id && (
                <DestinationImages kind={kind} row={row} onSaved={() => router.refresh()} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DestinationImages({
  kind,
  row,
  onSaved,
}: {
  kind: DestinationKind;
  row: DestinationRow;
  onSaved: () => void;
}) {
  const [hero, setHero] = useState(row.heroImage ?? '');
  const [alt, setAlt] = useState(row.heroAlt ?? '');
  const [gallery, setGallery] = useState<string[]>(row.gallery);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await saveStDestinationImages(kind, row.id, hero, alt, gallery);
    setSaving(false);
    setMessage(res.ok ? 'Saved.' : res.error);
    if (res.ok) onSaved();
  }

  return (
    <div className="space-y-5 border-t border-line bg-sand/40 p-5">
      <ImageField label={`${row.name} hero image`} value={hero} onChange={setHero} />
      <div>
        <label className="field-label">Hero alt text</label>
        <input
          className="field"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder={`Describe the ${row.name} hero image for accessibility`}
        />
      </div>
      <GalleryField label="Gallery images" images={gallery} onChange={setGallery} />
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-primary !py-2 text-xs disabled:opacity-60">
          {saving ? 'Saving…' : 'Save images'}
        </button>
        {message && <span className="text-xs font-semibold text-ink-soft">{message}</span>}
      </div>
    </div>
  );
}
