'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient } from '@/lib/pcst';

export type StActionState = { ok: boolean; message: string } | null;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

const parseJson = <T,>(value: FormDataEntryValue | null, fallback: T): T => {
  if (typeof value !== 'string' || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

/* ────────────────────────────── trips ────────────────────────────── */

export async function saveStTrip(_prev: StActionState, formData: FormData): Promise<StActionState> {
  await requireAdmin();
  const db = pcstClient();

  const id = formData.get('id') ? Number(formData.get('id')) : null;
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ok: false, message: 'A title is required.' };

  const priceRaw = String(formData.get('base_price_pp') ?? '').trim();
  const row = {
    slug: slugify(String(formData.get('slug') ?? '').trim() || title),
    title,
    subject_id: formData.get('subject_id') ? Number(formData.get('subject_id')) : null,
    country_id: formData.get('country_id') ? Number(formData.get('country_id')) : null,
    city: String(formData.get('city') ?? '').trim() || null,
    departs: String(formData.get('departs') ?? '').trim() || null,
    duration_days: Number(formData.get('duration_days') ?? 0) || 0,
    duration_nights: Number(formData.get('duration_nights') ?? 0) || 0,
    base_price_pp: priceRaw === '' ? null : Number(priceRaw),
    hero_image: String(formData.get('hero_image') ?? '').trim() || null,
    hero_alt: String(formData.get('hero_alt') ?? '').trim() || null,
    gallery: parseJson<string[]>(formData.get('gallery'), []),
    overview: parseJson<string[]>(formData.get('overview'), []),
    includes: parseJson<string[]>(formData.get('includes'), []),
    featured: formData.get('featured') === 'on',
    status: formData.get('status') === 'published' ? 'published' : 'draft',
  };

  let tripId = id;
  if (id) {
    const { error } = await db.from('trips').update(row).eq('id', id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { data, error } = await db.from('trips').insert(row).select('id').single();
    if (error || !data) return { ok: false, message: error?.message ?? 'Could not create the trip.' };
    tripId = data.id;
  }

  // Replace itinerary days, preserving each day's existing image by position.
  const itinerary = parseJson<{ label: string; title: string; description: string }[]>(
    formData.get('itinerary'),
    []
  ).filter((d) => d.label.trim() || d.title.trim() || d.description.trim());

  const { data: existingDays } = await db
    .from('itinerary_days')
    .select('sort_order, image_url, image_alt')
    .eq('trip_id', tripId!)
    .order('sort_order');
  await db.from('itinerary_days').delete().eq('trip_id', tripId!);
  if (itinerary.length > 0) {
    const { error: dayError } = await db.from('itinerary_days').insert(
      itinerary.map((d, i) => ({
        trip_id: tripId,
        sort_order: i,
        label: d.label,
        title: d.title,
        description: d.description,
        image_url: existingDays?.[i]?.image_url ?? null,
        image_alt: existingDays?.[i]?.image_alt ?? null,
      }))
    );
    if (dayError) return { ok: false, message: `Trip saved, but itinerary failed: ${dayError.message}` };
  }

  revalidatePath('/admin/school-trips');
  redirect('/admin/school-trips?saved=1');
}

export async function deleteStTrip(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const db = pcstClient();
  await db.from('itinerary_days').delete().eq('trip_id', id);
  await db.from('trips').delete().eq('id', id);
  revalidatePath('/admin/school-trips');
  redirect('/admin/school-trips');
}

/* ────────────────────────────── quotes ───────────────────────────── */

export async function setStQuoteStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const status = String(formData.get('status'));
  if (!id || !['draft', 'published', 'accepted', 'declined', 'expired'].includes(status)) return;
  const db = pcstClient();
  const patch: Record<string, unknown> = { status };
  if (status === 'published') patch.published_at = new Date().toISOString();
  await db.from('quotes').update(patch).eq('id', id);
  revalidatePath(`/admin/school-trips/quotes/${id}`);
  revalidatePath('/admin/school-trips/quotes');
}
