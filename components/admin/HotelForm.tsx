'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deleteHotel, saveHotel, type StayActionState } from '@/lib/admin/stay-actions';
import { ImageField } from '@/components/admin/ImageField';
import type { Destination, Hotel } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary !px-5 !py-2.5 disabled:opacity-60">
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

export default function HotelForm({
  hotel,
  destinations,
}: {
  hotel: Hotel | null;
  destinations: Destination[];
}) {
  const [state, formAction] = useFormState<StayActionState, FormData>(saveHotel, null);
  const [image, setImage] = useState(hotel?.image ?? '');

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {hotel && <input type="hidden" name="id" value={hotel.id} />}
      <input type="hidden" name="image" value={image} />
      <div>
        <label className="field-label">Hotel / resort name *</label>
        <input name="name" required defaultValue={hotel?.name} className="field" />
      </div>
      <div>
        <label className="field-label">Destination</label>
        <select name="destination_id" className="field" defaultValue={hotel?.destinationId ?? ''}>
          <option value="">— none —</option>
          {destinations.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Area</label>
        <input name="area" defaultValue={hotel?.area} className="field" placeholder="e.g. Baa Atoll · Khao Lak" />
      </div>
      <div>
        <label className="field-label">Style</label>
        <input name="style" defaultValue={hotel?.style} className="field" placeholder="e.g. Family resort · Adults-only · Villa" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Why we rate it</label>
        <textarea name="description" rows={2} defaultValue={hotel?.description} className="field" placeholder="One or two editorial sentences — no rates or availability claims." />
      </div>
      <div className="sm:col-span-2">
        <ImageField label="Image" value={image} onChange={setImage} />
      </div>
      <div>
        <label className="field-label">Sort order</label>
        <input name="sort_order" type="number" defaultValue={hotel?.sortOrder ?? 0} className="field" />
      </div>
      <div className="flex items-end justify-end gap-3 pb-1">
        {state && <p className={`text-sm ${state.ok ? 'text-teal-deep' : 'text-danger'}`}>{state.message}</p>}
        {hotel && (
          <button
            type="submit"
            formAction={deleteHotel}
            formNoValidate
            className="text-sm font-semibold text-danger hover:underline"
            onClick={(e) => {
              if (!confirm('Delete this hotel? Journeys linking it will simply stop showing it.')) e.preventDefault();
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
