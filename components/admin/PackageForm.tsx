'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deletePackage, savePackage, type ActionState } from '@/lib/admin/actions';
import ListEditor from '@/components/admin/ListEditor';
import ItineraryEditor from '@/components/admin/ItineraryEditor';
import type { Destination, ItineraryDay, Package } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? 'Saving…' : 'Save package'}
    </button>
  );
}

export default function PackageForm({
  pkg,
  destinations,
}: {
  pkg: Package | null;
  destinations: Destination[];
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(savePackage, null);

  const [overview, setOverview] = useState<string[]>(pkg?.overview ?? ['']);
  const [highlights, setHighlights] = useState<string[]>(pkg?.highlights ?? ['']);
  const [includes, setIncludes] = useState<string[]>(pkg?.includes ?? ['']);
  const [excludes, setExcludes] = useState<string[]>(pkg?.excludes ?? ['']);
  const [gallery, setGallery] = useState<string[]>(pkg?.gallery ?? []);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(pkg?.itinerary ?? []);

  const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

  return (
    <form action={formAction} className="space-y-8">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <input type="hidden" name="overview" value={JSON.stringify(clean(overview))} />
      <input type="hidden" name="highlights" value={JSON.stringify(clean(highlights))} />
      <input type="hidden" name="includes" value={JSON.stringify(clean(includes))} />
      <input type="hidden" name="excludes" value={JSON.stringify(clean(excludes))} />
      <input type="hidden" name="gallery" value={JSON.stringify(clean(gallery))} />
      <input
        type="hidden"
        name="itinerary"
        value={JSON.stringify(itinerary.filter((d) => d.label.trim() || d.title.trim() || d.description.trim()))}
      />

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Basics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">Title *</label>
            <input name="title" required defaultValue={pkg?.title} className="field" placeholder="e.g. Hard Rock Hotel Maldives" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Tagline</label>
            <input name="tagline" defaultValue={pkg?.tagline} className="field" placeholder="One irresistible sentence shown on cards and the page header" />
          </div>
          <div>
            <label className="field-label">Destination</label>
            <select name="destination_id" className="field" defaultValue={destinations.find((d) => d.slug === pkg?.destinationSlug)?.id ?? ''}>
              <option value="">— none —</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Style</label>
            <select name="category" className="field" defaultValue={pkg?.category ?? ''}>
              <option value="">— none —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Nights</label>
            <input name="nights" type="number" min={0} defaultValue={pkg?.nights ?? 4} className="field" />
          </div>
          <div>
            <label className="field-label">Days</label>
            <input name="days" type="number" min={0} defaultValue={pkg?.days ?? 5} className="field" />
          </div>
          <div>
            <label className="field-label">Price from (per person)</label>
            <input name="price_from" type="number" step="0.01" min={0} defaultValue={pkg?.priceFrom ?? ''} className="field" placeholder="Leave empty for “price on request”" />
          </div>
          <div>
            <label className="field-label">Currency</label>
            <input name="currency" defaultValue={pkg?.currency ?? 'AED'} className="field" />
          </div>
          <div>
            <label className="field-label">Hotel (optional)</label>
            <input name="hotel_name" defaultValue={pkg?.hotelName ?? ''} className="field" />
          </div>
          <div>
            <label className="field-label">Board basis (optional)</label>
            <input name="board_basis" defaultValue={pkg?.boardBasis ?? ''} className="field" placeholder="e.g. All Inclusive" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Slug</label>
            <input name="slug" defaultValue={pkg?.slug} className="field" placeholder="Auto-generated from the title if left empty" />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Images</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Paste image URLs (Unsplash, your Supabase storage, or any https image).
        </p>
        <div className="mt-5 space-y-5">
          <div>
            <label className="field-label">Hero image URL</label>
            <input name="hero_image" defaultValue={pkg?.heroImage} className="field" placeholder="https://…" />
          </div>
          <ListEditor label="Gallery images" items={gallery} onChange={setGallery} placeholder="https://…" />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Content</h2>
        <div className="mt-5 space-y-6">
          <ListEditor label="Overview paragraphs" items={overview} onChange={setOverview} multiline placeholder="A paragraph of sales copy…" />
          <ListEditor label="Highlights" items={highlights} onChange={setHighlights} placeholder="e.g. 15-minute speedboat transfer" />
          <ItineraryEditor items={itinerary} onChange={setItinerary} />
          <div className="grid gap-6 sm:grid-cols-2">
            <ListEditor label="What's included" items={includes} onChange={setIncludes} placeholder="e.g. Daily breakfast" />
            <ListEditor label="Not included" items={excludes} onChange={setExcludes} placeholder="e.g. International flights" />
          </div>
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" name="featured" defaultChecked={pkg?.featured} className="h-4 w-4 accent-teal" />
            Featured on homepage
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              name="status"
              value="published"
              defaultChecked={pkg?.status === 'published'}
              className="h-4 w-4 accent-teal"
            />
            Published (visible on the website)
          </label>
        </div>
        <div className="flex items-center gap-3">
          {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
          <SaveButton />
        </div>
      </section>

      {pkg && (
        <div className="text-right">
          <button
            type="submit"
            formAction={deletePackage}
            formNoValidate
            className="text-sm font-semibold text-danger hover:underline"
            onClick={(e) => {
              if (!confirm('Delete this package permanently?')) e.preventDefault();
            }}
          >
            Delete package
          </button>
        </div>
      )}
    </form>
  );
}
