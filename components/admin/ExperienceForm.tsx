'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deleteExperience, saveExperience, type StayActionState } from '@/lib/admin/stay-actions';
import { ImageField } from '@/components/admin/ImageField';
import type { Destination, Experience } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary !px-5 !py-2.5 disabled:opacity-60">
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

export default function ExperienceForm({
  experience,
  destinations,
}: {
  experience: Experience | null;
  destinations: Destination[];
}) {
  const [state, formAction] = useFormState<StayActionState, FormData>(saveExperience, null);
  const [image, setImage] = useState(experience?.image ?? '');

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {experience && <input type="hidden" name="id" value={experience.id} />}
      <input type="hidden" name="image" value={image} />
      <div>
        <label className="field-label">Experience title *</label>
        <input name="title" required defaultValue={experience?.title} className="field" placeholder="e.g. Sandbank picnic" />
      </div>
      <div>
        <label className="field-label">Destination</label>
        <select name="destination_id" className="field" defaultValue={experience?.destinationId ?? ''}>
          <option value="">— none —</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Description</label>
        <textarea name="body" rows={2} defaultValue={experience?.body} className="field" />
      </div>
      <div className="sm:col-span-2">
        <ImageField label="Image (optional)" value={image} onChange={setImage} />
      </div>
      <div>
        <label className="field-label">Sort order</label>
        <input name="sort_order" type="number" defaultValue={experience?.sortOrder ?? 0} className="field" />
      </div>
      <div className="flex items-end justify-end gap-3 pb-1">
        {state && <p className={`text-sm ${state.ok ? 'text-teal-deep' : 'text-danger'}`}>{state.message}</p>}
        {experience && (
          <button
            type="submit"
            formAction={deleteExperience}
            formNoValidate
            className="text-sm font-semibold text-danger hover:underline"
            onClick={(e) => {
              if (!confirm('Delete this experience?')) e.preventDefault();
            }}
          >
            Delete
          </button>
        )}
        <SaveButton />
      </div>
    </form>
  );
}
