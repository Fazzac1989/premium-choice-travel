'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deleteDestination, saveDestination, type ActionState } from '@/lib/admin/actions';
import { ImageField } from '@/components/admin/ImageField';
import ListEditor from '@/components/admin/ListEditor';
import SectionsEditor from '@/components/admin/SectionsEditor';
import type { Destination, GuideSection } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary !px-5 !py-2.5 disabled:opacity-60">
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

export default function DestinationForm({ destination }: { destination: Destination | null }) {
  const [state, formAction] = useFormState<ActionState, FormData>(saveDestination, null);
  const [heroImage, setHeroImage] = useState(destination?.heroImage ?? '');
  const [intro, setIntro] = useState<string[]>(destination?.intro ?? []);
  const [whenToTravel, setWhenToTravel] = useState<GuideSection[]>(destination?.whenToTravel ?? []);
  const [culture, setCulture] = useState<GuideSection[]>(destination?.culture ?? []);

  const cleanSections = (xs: GuideSection[]) =>
    xs.filter((s) => s.heading.trim() || s.body.trim());

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {destination && <input type="hidden" name="id" value={destination.id} />}
      <input type="hidden" name="hero_image" value={heroImage} />
      <input type="hidden" name="intro" value={JSON.stringify(intro.map((p) => p.trim()).filter(Boolean))} />
      <input type="hidden" name="when_to_travel" value={JSON.stringify(cleanSections(whenToTravel))} />
      <input type="hidden" name="culture" value={JSON.stringify(cleanSections(culture))} />
      <div>
        <label className="field-label">Name *</label>
        <input name="name" required defaultValue={destination?.name} className="field" />
      </div>
      <div>
        <label className="field-label">Region</label>
        <input name="region" defaultValue={destination?.region} className="field" placeholder="e.g. Indian Ocean" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Blurb</label>
        <textarea name="blurb" rows={2} defaultValue={destination?.blurb} className="field" placeholder="One or two enticing sentences" />
      </div>
      <div className="sm:col-span-2">
        <ImageField label="Hero image" value={heroImage} onChange={setHeroImage} />
      </div>
      <div className="sm:col-span-2">
        <ListEditor
          label="Guide introduction"
          hint="Paragraphs at the top of the destination guide"
          items={intro}
          onChange={setIntro}
          multiline
          placeholder="An introductory paragraph…"
        />
      </div>
      <div className="sm:col-span-2">
        <SectionsEditor
          label="When to travel"
          hint="One entry per season or month range"
          items={whenToTravel}
          onChange={setWhenToTravel}
          headingPlaceholder="e.g. November – April"
          bodyPlaceholder="What that season is like and why to pick it…"
        />
      </div>
      <div className="sm:col-span-2">
        <SectionsEditor
          label="Culture & know before you go"
          hint="Sections with headers shown on the guide"
          items={culture}
          onChange={setCulture}
          headingPlaceholder="e.g. Food & flavours"
          bodyPlaceholder="A short editorial paragraph…"
        />
      </div>
      <div>
        <label className="field-label">Sort order</label>
        <input name="sort_order" type="number" defaultValue={destination?.sortOrder ?? 0} className="field" />
      </div>
      <div className="flex items-end justify-between gap-4">
        <label className="flex items-center gap-2 pb-2.5 text-sm font-semibold text-ink">
          <input type="checkbox" name="featured" defaultChecked={destination?.featured} className="h-4 w-4 accent-teal" />
          Featured
        </label>
        <div className="flex items-center gap-3 pb-1">
          {destination && (
            <button
              type="submit"
              formAction={deleteDestination}
              formNoValidate
              className="text-sm font-semibold text-danger hover:underline"
              onClick={(e) => {
                if (!confirm('Delete this destination? Its packages keep existing but lose the link.')) e.preventDefault();
              }}
            >
              Delete
            </button>
          )}
          <SaveButton />
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-danger sm:col-span-2">{state.message}</p>}
    </form>
  );
}
