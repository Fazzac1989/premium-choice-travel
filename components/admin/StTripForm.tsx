'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deleteStTrip, saveStTrip, type StActionState } from '@/lib/admin/st-actions';
import ListEditor from '@/components/admin/ListEditor';
import ItineraryEditor from '@/components/admin/ItineraryEditor';
import { GalleryField, ImageField } from '@/components/admin/ImageField';
import type { StTrip } from '@/lib/pcst';
import type { ItineraryDay } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
      {pending ? 'Saving…' : 'Save trip'}
    </button>
  );
}

export default function StTripForm({
  trip,
  subjects,
  countries,
}: {
  trip: StTrip | null;
  subjects: { id: number; name: string }[];
  countries: { id: number; name: string }[];
}) {
  const [state, formAction] = useFormState<StActionState, FormData>(saveStTrip, null);

  const [overview, setOverview] = useState<string[]>(trip?.overview ?? ['']);
  const [includes, setIncludes] = useState<string[]>(trip?.includes ?? ['']);
  const [heroImage, setHeroImage] = useState<string>(trip?.heroImage ?? '');
  const [gallery, setGallery] = useState<string[]>(trip?.gallery ?? []);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(
    (trip?.itinerary ?? []).map((d) => ({
      label: d.label,
      title: d.title,
      description: d.description,
      imageUrl: d.imageUrl ?? '',
    }))
  );

  // Drop anything that is not a string rather than trusting the shape: these
  // lists come from a JSON column that has held more than one format over the
  // years, and calling .trim() on an object takes the whole editor down.
  const clean = (xs: unknown[]) =>
    xs.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean);

  return (
    <form action={formAction} className="space-y-8">
      {trip && <input type="hidden" name="id" value={trip.id} />}
      <input type="hidden" name="overview" value={JSON.stringify(clean(overview))} />
      <input type="hidden" name="includes" value={JSON.stringify(clean(includes))} />
      <input type="hidden" name="gallery" value={JSON.stringify(clean(gallery))} />
      <input type="hidden" name="hero_image" value={heroImage} />
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
            <input name="title" required defaultValue={trip?.title} className="field" placeholder='e.g. "Geography Trip to Iceland"' />
          </div>
          <div>
            <label className="field-label">Subject</label>
            <select name="subject_id" className="field" defaultValue={trip?.subjectId ?? ''}>
              <option value="">— none —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Country</label>
            <select name="country_id" className="field" defaultValue={trip?.countryId ?? ''}>
              <option value="">— none —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">City / route</label>
            <input name="city" defaultValue={trip?.city} className="field" placeholder="e.g. Tokyo · Kyoto" />
          </div>
          <div>
            <label className="field-label">Departs from</label>
            <input name="departs" defaultValue={trip?.departs} className="field" placeholder="e.g. Dubai" />
          </div>
          <div>
            <label className="field-label">Days</label>
            <input name="duration_days" type="number" min={0} defaultValue={trip?.durationDays ?? 5} className="field" />
          </div>
          <div>
            <label className="field-label">Nights</label>
            <input name="duration_nights" type="number" min={0} defaultValue={trip?.durationNights ?? 4} className="field" />
          </div>
          <div>
            <label className="field-label">Base price per pupil (optional)</label>
            <input name="base_price_pp" type="number" step="0.01" min={0} defaultValue={trip?.basePricePp ?? ''} className="field" />
          </div>
          <div>
            <label className="field-label">Slug</label>
            <input name="slug" defaultValue={trip?.slug} className="field" placeholder="Auto-generated if left empty" />
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Images</h2>
        <div className="mt-5 space-y-6">
          <ImageField label="Hero image" value={heroImage} onChange={setHeroImage} />
          <div>
            <label className="field-label">Hero alt text</label>
            <input name="hero_alt" defaultValue={trip?.heroAlt} className="field" placeholder="Describe the hero image for accessibility" />
          </div>
          <GalleryField label="Gallery images" images={gallery} onChange={setGallery} />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Content</h2>
        <div className="mt-5 space-y-6">
          <ListEditor label="Overview paragraphs" items={overview} onChange={setOverview} multiline placeholder="A paragraph aimed at teachers…" />
          <ItineraryEditor items={itinerary} onChange={setItinerary} />
          <ListEditor label="What's included" items={includes} onChange={setIncludes} placeholder="e.g. Return flights from Dubai" />
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" name="featured" defaultChecked={trip?.featured} className="h-4 w-4 accent-teal" />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" name="status" value="published" defaultChecked={trip?.status === 'published'} className="h-4 w-4 accent-teal" />
            Published (live on the School Trips site)
          </label>
        </div>
        <div className="flex items-center gap-3">
          {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
          <SaveButton />
        </div>
      </section>

      {trip && (
        <div className="text-right">
          <button
            type="submit"
            formAction={deleteStTrip}
            formNoValidate
            className="text-sm font-semibold text-danger hover:underline"
            onClick={(e) => {
              if (!confirm('Delete this trip permanently from the School Trips site?')) e.preventDefault();
            }}
          >
            Delete trip
          </button>
        </div>
      )}
    </form>
  );
}
