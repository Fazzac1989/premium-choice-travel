'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deletePackage, savePackage, type ActionState } from '@/lib/admin/actions';
import ListEditor from '@/components/admin/ListEditor';
import ItineraryEditor from '@/components/admin/ItineraryEditor';
import { GalleryField, ImageField } from '@/components/admin/ImageField';
import BrandDetailsFields from '@/components/admin/BrandDetailsFields';
import type { Destination, ItineraryDay, Package } from '@/lib/types';
import { CATEGORIES } from '@/lib/types';
import { PACKAGE_BRANDS } from '@/lib/brands';

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
  defaultBrand,
  hotelOptions = [],
  experienceOptions = [],
}: {
  pkg: Package | null;
  destinations: Destination[];
  defaultBrand?: string;
  hotelOptions?: { id: number; label: string }[];
  experienceOptions?: { id: number; label: string }[];
}) {
  const [state, formAction] = useFormState<ActionState, FormData>(savePackage, null);

  const [overview, setOverview] = useState<string[]>(pkg?.overview ?? ['']);
  const [highlights, setHighlights] = useState<string[]>(pkg?.highlights ?? ['']);
  const [includes, setIncludes] = useState<string[]>(pkg?.includes ?? ['']);
  const [excludes, setExcludes] = useState<string[]>(pkg?.excludes ?? ['']);
  const [heroImage, setHeroImage] = useState<string>(pkg?.heroImage ?? '');
  const [gallery, setGallery] = useState<string[]>(pkg?.gallery ?? []);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(pkg?.itinerary ?? []);
  const [tags, setTags] = useState<string[]>(pkg?.tags ?? []);
  const [whoFor, setWhoFor] = useState<string[]>(pkg?.whoFor ?? []);
  const [whyWorks, setWhyWorks] = useState<string[]>(pkg?.whyWorks ?? []);
  const [extensions, setExtensions] = useState<string[]>(pkg?.extensions ?? []);
  const [brandSel, setBrandSel] = useState<string>(pkg?.brand ?? defaultBrand ?? 'holidays');
  const [details, setDetails] = useState<Record<string, any>>(pkg?.details ?? {});

  const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

  return (
    <form action={formAction} className="space-y-8">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <input type="hidden" name="overview" value={JSON.stringify(clean(overview))} />
      <input type="hidden" name="highlights" value={JSON.stringify(clean(highlights))} />
      <input type="hidden" name="includes" value={JSON.stringify(clean(includes))} />
      <input type="hidden" name="excludes" value={JSON.stringify(clean(excludes))} />
      <input type="hidden" name="gallery" value={JSON.stringify(clean(gallery))} />
      <input type="hidden" name="hero_image" value={heroImage} />
      <input type="hidden" name="tags" value={JSON.stringify(clean(tags))} />
      <input type="hidden" name="who_for" value={JSON.stringify(clean(whoFor))} />
      <input type="hidden" name="why_works" value={JSON.stringify(clean(whyWorks))} />
      <input type="hidden" name="extensions" value={JSON.stringify(clean(extensions))} />
      <input type="hidden" name="details" value={JSON.stringify(details)} />
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
            <label className="field-label">Brand section</label>
            <select name="brand" className="field" value={brandSel} onChange={(e) => setBrandSel(e.target.value)}>
              {PACKAGE_BRANDS.map((b) => (
                <option key={b.key} value={b.key}>Premium Choice {b.label}</option>
              ))}
            </select>
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
        <h2 className="font-serif text-xl text-ink">Journey content</h2>
        <div className="mt-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <ListEditor label="Who it suits" items={whoFor} onChange={setWhoFor} placeholder="e.g. Families with under-10s" />
            <ListEditor label="Why this journey works" items={whyWorks} onChange={setWhyWorks} placeholder="e.g. One flight, two very different islands" />
          </div>
          <ListEditor label="AI inspiration tags" hint="family, winter-sun, multi-centre…" items={tags} onChange={setTags} placeholder="e.g. winter-sun" />
          <ListEditor label="Suggested extensions" items={extensions} onChange={setExtensions} placeholder="e.g. Add 3 nights in Singapore" />
          <div>
            <label className="field-label">Seasonal advice</label>
            <textarea name="seasonal_notes" rows={2} defaultValue={pkg?.seasonalNotes} className="field" placeholder="When this journey is at its best — guidance, never a weather promise." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">SEO title</label>
              <input name="seo_title" defaultValue={pkg?.seoTitle} className="field" placeholder="e.g. Thailand Island Hopping Holiday from Dubai" />
            </div>
            <div>
              <label className="field-label">SEO description</label>
              <input name="seo_description" defaultValue={pkg?.seoDescription} className="field" />
            </div>
          </div>
        </div>
      </section>

      {['golf', 'cruises', 'staycations'].includes(brandSel) && (
        <section className="card p-6">
          <h2 className="font-serif text-xl text-ink">
            {brandSel === 'golf' ? 'Golf details' : brandSel === 'cruises' ? 'Cruise details' : 'Staycation details'}
          </h2>
          <div className="mt-5">
            <BrandDetailsFields brand={brandSel} details={details} onChange={setDetails} />
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Images</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Upload straight from your computer — images are stored on your own Supabase storage.
        </p>
        <div className="mt-5 space-y-6">
          <ImageField label="Hero image" value={heroImage} onChange={setHeroImage} />
          <GalleryField label="Gallery images" images={gallery} onChange={setGallery} />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-serif text-xl text-ink">Content</h2>
        <div className="mt-5 space-y-6">
          <ListEditor label="Overview paragraphs" items={overview} onChange={setOverview} multiline placeholder="A paragraph of sales copy…" />
          <ListEditor label="Highlights" items={highlights} onChange={setHighlights} placeholder="e.g. 15-minute speedboat transfer" />
          <ItineraryEditor
            items={itinerary}
            onChange={setItinerary}
            hotelOptions={hotelOptions}
            experienceOptions={experienceOptions}
          />
          {pkg && hotelOptions.length === 0 && experienceOptions.length === 0 && (
            <p className="-mt-3 text-xs text-ink-soft">
              Add hotels and experiences for {pkg.destinationName || 'this destination'} in the
              Hotels / Experiences sections, then reopen this journey to link them to stages.
            </p>
          )}
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
            Status
            <select name="status" defaultValue={pkg?.status ?? 'draft'} className="field !w-auto !py-1.5">
              <option value="draft">Draft — commercial review required</option>
              <option value="review">Ready for review</option>
              <option value="published">Published (live)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            Pricing
            <select name="price_status" defaultValue={pkg?.priceStatus ?? 'on_request'} className="field !w-auto !py-1.5">
              <option value="on_request">On request</option>
              <option value="approved">Approved to display</option>
            </select>
          </label>
        </div>
        <div className="flex items-center gap-3">
          {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
          <SaveButton />
        </div>
        <div className="w-full">
          <label className="field-label">Review note (why this is held back)</label>
          <input name="review_note" defaultValue={pkg?.reviewNote} className="field" placeholder="e.g. Course access unverified · supplier rates pending" />
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
