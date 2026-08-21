'use client';

/* eslint-disable @next/next/no-img-element -- remote Commons previews and storage thumbnails */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  approveStImage,
  deleteStImage,
  searchStImages,
  shortlistForStTrip,
  updateStImage,
  type Shortlist,
} from '@/lib/admin/st-image-actions';
import type { Candidate } from '@/lib/images/commons';

export type CuratorImage = {
  id: number;
  role: string;
  url: string;
  altText: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  photographer: string | null;
  licence: string | null;
  sourceUrl: string | null;
  sortOrder: number;
};

export type CuratorTrip = {
  id: number;
  slug: string;
  title: string;
  status: string;
  subject: string | null;
  country: string | null;
  legacyHero: string | null;
  images: CuratorImage[];
};

const GALLERY_TARGET = 5;

export default function StImageCurator({
  trips,
  initialTripId,
  siteUrl,
}: {
  trips: CuratorTrip[];
  initialTripId: number | null;
  siteUrl: string;
}) {
  const router = useRouter();
  const [tripId, setTripId] = useState<number | null>(initialTripId ?? trips[0]?.id ?? null);
  const [shortlists, setShortlists] = useState<Shortlist[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Candidate[] | null>(null);

  const trip = trips.find((t) => t.id === tripId) ?? null;
  const hero = trip?.images.find((i) => i.role === 'hero') ?? null;
  const gallery = trip?.images.filter((i) => i.role === 'gallery') ?? [];
  const done = Boolean(hero) && gallery.length >= GALLERY_TARGET;

  const incomplete = trips.filter(
    (t) =>
      !t.images.some((i) => i.role === 'hero') ||
      t.images.filter((i) => i.role === 'gallery').length < GALLERY_TARGET
  );

  async function loadShortlists() {
    if (!tripId) return;
    setBusy('shortlist');
    setError(null);
    setShortlists(null);
    const res = await shortlistForStTrip(tripId);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setShortlists(res.shortlists);
  }

  async function approve(c: Candidate, role: string, label: string, sortOrder: number) {
    if (!tripId) return;
    setBusy(c.sourceUrl);
    setError(null);
    const res = await approveStImage({
      tripId,
      role: role as 'hero' | 'gallery',
      label,
      candidate: c,
      sortOrder,
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    setBusy('search');
    setError(null);
    const res = await searchStImages(query);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setSearchResults(res.candidates);
  }

  return (
    <>
      <div className="mt-8 flex flex-wrap items-end gap-4">
        <label className="min-w-[320px] flex-1">
          <span className="field-label">Trip</span>
          <select
            className="field"
            value={tripId ?? ''}
            onChange={(e) => {
              setTripId(Number(e.target.value));
              setShortlists(null);
              setSearchResults(null);
              setError(null);
            }}
          >
            {trips.map((t) => {
              const h = t.images.some((i) => i.role === 'hero');
              const g = t.images.filter((i) => i.role === 'gallery').length;
              const complete = h && g >= GALLERY_TARGET;
              return (
                <option key={t.id} value={t.id}>
                  {complete ? '✓' : `${g}/${GALLERY_TARGET}`} · {t.title}
                  {t.status !== 'published' ? ` (${t.status})` : ''}
                </option>
              );
            })}
          </select>
        </label>

        <button className="btn-primary !py-2.5" onClick={loadShortlists} disabled={busy !== null || !tripId}>
          {busy === 'shortlist' ? 'Finding candidates…' : 'Build shortlists'}
        </button>

        {trip && (
          <a
            className="btn-outline !bg-white !py-2.5"
            href={`${siteUrl}/trips/${trip.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            View the page ↗
          </a>
        )}
      </div>

      <p className="mt-3 text-sm text-ink-soft">
        <span className={done ? 'font-semibold text-teal-deep' : 'font-semibold text-ink'}>
          {hero ? 1 : 0} hero · {gallery.length}/{GALLERY_TARGET} gallery
          {done && ' — complete'}
        </span>
        {' · '}
        {incomplete.length} of {trips.length} trips still need photography
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {trip && trip.images.length > 0 && (
        <section className="card mt-8 p-5">
          <p className="eyebrow">Approved for {trip.title}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {trip.images.map((img) => (
              <ApprovedCard key={img.id} image={img} onChanged={() => router.refresh()} />
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            Alt text saves when you click away from the field. A red field means the image is
            publishing without alt text.
          </p>
        </section>
      )}

      {shortlists?.map((list, i) => {
        const filled = list.role === 'hero' ? Boolean(hero) : gallery.length >= GALLERY_TARGET;
        return (
          <section key={`${list.role}-${i}`} className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-serif text-xl text-ink">
                {i + 1}. {list.label}
              </h2>
              <span className="text-xs text-ink-soft">
                searched “{list.usedQuery}”
                {list.usedQuery !== list.query && ' (broadened)'} · {list.candidates.length} candidates
                {filled && ' · slot already filled'}
              </span>
            </div>

            {list.candidates.length === 0 ? (
              <p className="card mt-3 p-4 text-sm text-ink-soft">
                Nothing suitable found. Use the manual search below with a different term.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {list.candidates.map((c) => (
                  <CandidateCard
                    key={c.sourceUrl}
                    candidate={c}
                    busy={busy === c.sourceUrl}
                    disabled={busy !== null}
                    onApprove={() => approve(c, list.role, list.label, i)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="mt-12 border-t border-line pt-8">
        <form onSubmit={runSearch} className="flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1">
            <span className="field-label">Search Shutterstock yourself</span>
            <input
              className="field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pompeii forum ruins"
            />
          </label>
          <button className="btn-outline !bg-white !py-2.5" disabled={busy !== null}>
            {busy === 'search' ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchResults && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {searchResults.map((c) => (
              <CandidateCard
                key={c.sourceUrl}
                candidate={c}
                busy={busy === c.sourceUrl}
                disabled={busy !== null}
                onApprove={() =>
                  approve(c, hero ? 'gallery' : 'hero', 'Manual selection', gallery.length)
                }
              />
            ))}
            {searchResults.length === 0 && (
              <p className="col-span-full text-sm text-ink-soft">No freely licensed matches.</p>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function CandidateCard({
  candidate,
  busy,
  disabled,
  onApprove,
}: {
  candidate: Candidate;
  busy: boolean;
  disabled: boolean;
  onApprove: () => void;
}) {
  return (
    <div className="card flex flex-col">
      <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="block bg-sand">
        <img src={candidate.previewUrl} alt="" className="h-32 w-full object-cover" loading="lazy" />
      </a>
      <div className="flex flex-1 flex-col gap-1 p-2.5 text-xs">
        <p className="text-ink-soft">
          {candidate.width}×{candidate.height} · {candidate.licence}
        </p>
        <p className="truncate text-ink" title={candidate.photographer ?? ''}>
          {candidate.photographer ?? 'Unknown photographer'}
        </p>
        <button
          className="mt-auto rounded-lg border border-line px-2 py-1.5 font-semibold text-ink-soft transition-colors hover:border-teal hover:text-teal-deep disabled:opacity-50"
          onClick={onApprove}
          disabled={disabled}
        >
          {busy ? 'Saving…' : 'Approve'}
        </button>
      </div>
    </div>
  );
}

function ApprovedCard({ image, onChanged }: { image: CuratorImage; onChanged: () => void }) {
  const [alt, setAlt] = useState(image.altText);
  const [busy, setBusy] = useState(false);

  return (
    <div className="card">
      <img src={image.url} alt={image.altText} className="h-28 w-full object-cover" loading="lazy" />
      <div className="grid gap-1.5 p-2.5 text-xs">
        <div className="flex justify-between text-ink-soft">
          <span className="font-semibold uppercase tracking-wider">{image.role}</span>
          <span>
            {image.width}×{image.height}
          </span>
        </div>
        <input
          className={`w-full rounded-lg border px-2 py-1 text-xs outline-none focus:border-teal ${
            alt.trim() ? 'border-line' : 'border-danger/40 bg-danger/5'
          }`}
          value={alt}
          placeholder="Alt text"
          onChange={(e) => setAlt(e.target.value)}
          onBlur={async () => {
            if (alt === image.altText) return;
            setBusy(true);
            await updateStImage(image.id, { altText: alt });
            setBusy(false);
            onChanged();
          }}
        />
        <p className="truncate text-ink-soft" title={`${image.photographer} — ${image.licence}`}>
          {image.photographer ?? '—'} · {image.licence ?? '—'}
        </p>
        <button
          className="text-left font-semibold text-ink-soft hover:text-danger disabled:opacity-50"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm('Remove this image?')) return;
            setBusy(true);
            await deleteStImage(image.id);
            setBusy(false);
            onChanged();
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
