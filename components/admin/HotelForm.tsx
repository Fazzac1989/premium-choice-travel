'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { deleteHotel, saveHotel, type StayActionState } from '@/lib/admin/stay-actions';
import { GalleryField, ImageField } from '@/components/admin/ImageField';
import ListEditor from '@/components/admin/ListEditor';
import SectionsEditor from '@/components/admin/SectionsEditor';
import type { Destination, GuideSection, Hotel } from '@/lib/types';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary !px-5 !py-2.5 disabled:opacity-60">
      {pending ? 'Saving…' : 'Save hotel'}
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
  const [gallery, setGallery] = useState<string[]>(hotel?.gallery ?? []);
  const [intro, setIntro] = useState<string[]>(hotel?.intro ?? []);
  const [features, setFeatures] = useState<string[]>(hotel?.features ?? []);
  const [mealPlans, setMealPlans] = useState<string[]>(hotel?.mealPlans ?? []);
  const [roomTypes, setRoomTypes] = useState<GuideSection[]>(hotel?.roomTypes ?? []);
  const [restaurants, setRestaurants] = useState<GuideSection[]>(hotel?.restaurants ?? []);

  const clean = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
  const cleanSections = (xs: GuideSection[]) => xs.filter((s) => s.heading.trim() || s.body.trim());

  return (
    <form action={formAction} className="space-y-6">
      {hotel && <input type="hidden" name="id" value={hotel.id} />}
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="gallery" value={JSON.stringify(clean(gallery))} />
      <input type="hidden" name="intro" value={JSON.stringify(clean(intro))} />
      <input type="hidden" name="features" value={JSON.stringify(clean(features))} />
      <input type="hidden" name="meal_plans" value={JSON.stringify(clean(mealPlans))} />
      <input type="hidden" name="room_types" value={JSON.stringify(cleanSections(roomTypes))} />
      <input type="hidden" name="restaurants" value={JSON.stringify(cleanSections(restaurants))} />

      <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="field-label">One-line summary (shown on journey cards)</label>
          <textarea name="description" rows={2} defaultValue={hotel?.description} className="field" placeholder="One or two editorial sentences — no rates or availability claims." />
        </div>
      </div>

      <div className="space-y-5 rounded-xl bg-sand/60 p-4">
        <ListEditor
          label="Introduction"
          hint="Paragraphs at the top of the hotel page"
          items={intro}
          onChange={setIntro}
          multiline
          placeholder="An editorial paragraph about the hotel…"
        />
        <ListEditor
          label="Features"
          hint="Short bullets — kids’ club, house reef, spa…"
          items={features}
          onChange={setFeatures}
          placeholder="e.g. Overwater spa"
        />
        <SectionsEditor
          label="Room types"
          hint="One entry per category"
          items={roomTypes}
          onChange={setRoomTypes}
          headingPlaceholder="e.g. Beach Pool Villa"
          bodyPlaceholder="What it's like, who it suits…"
        />
        <SectionsEditor
          label="Restaurants & bars"
          items={restaurants}
          onChange={setRestaurants}
          headingPlaceholder="e.g. Sessions"
          bodyPlaceholder="Cuisine and setting…"
        />
        <ListEditor
          label="Meal plans"
          hint="Board bases available"
          items={mealPlans}
          onChange={setMealPlans}
          placeholder="e.g. Half Board"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">How to get there</label>
          <textarea name="getting_there" rows={2} defaultValue={hotel?.gettingThere} className="field" placeholder="e.g. Fly to Malé, then the resort's speedboat from the airport jetty." />
        </div>
        <div>
          <label className="field-label">Transfer duration</label>
          <input name="transfer_duration" defaultValue={hotel?.transferDuration} className="field" placeholder="e.g. 15 minutes by speedboat" />
        </div>
        <div>
          <label className="field-label">Sort order</label>
          <input name="sort_order" type="number" defaultValue={hotel?.sortOrder ?? 0} className="field" />
        </div>
      </div>

      <div className="space-y-5">
        <ImageField label="Hero image" value={image} onChange={setImage} />
        <GalleryField label="Gallery images" images={gallery} onChange={setGallery} />
      </div>

      <div className="flex items-center justify-end gap-3">
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
