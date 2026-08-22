'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';

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
    departs: String(formData.get('departs') ?? '').trim() || 'Dubai',
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

  // Replace itinerary days. The editor now carries each day's image, so a
  // value from the form wins; days saved before the field existed fall back
  // to whatever image the same position already had.
  const itinerary = parseJson<{ label: string; title: string; description: string; imageUrl?: string | null }[]>(
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
        image_url: d.imageUrl !== undefined ? d.imageUrl?.trim() || null : existingDays?.[i]?.image_url ?? null,
        image_alt: existingDays?.[i]?.image_alt ?? null,
      }))
    );
    if (dayError) return { ok: false, message: `Trip saved, but itinerary failed: ${dayError.message}` };
  }

  revalidatePath('/admin/school-trips');
  // The trip lives in the School Trips database but is rendered by that site's
  // own deployment, so it must be told to rebuild or a publish stays invisible.
  await revalidatePcst(row.slug);
  redirect('/admin/school-trips?saved=1');
}

export async function deleteStTrip(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const db = pcstClient();
  // Read the slug first: after the delete there is nothing left to name the
  // public page that now has to be cleared.
  const { data: existing } = await db.from('trips').select('slug').eq('id', id).maybeSingle();
  await db.from('itinerary_days').delete().eq('trip_id', id);
  await db.from('trips').delete().eq('id', id);
  revalidatePath('/admin/school-trips');
  await revalidatePcst(existing?.slug ?? null);
  redirect('/admin/school-trips');
}

/* ────────────────────────────── quotes ───────────────────────────── */

export async function saveStQuote(_prev: StActionState, formData: FormData): Promise<StActionState> {
  await requireAdmin();
  const db = pcstClient();

  const id = Number(formData.get('id'));
  if (!id) return { ok: false, message: 'Missing quote id.' };

  let payload: any;
  try {
    payload = JSON.parse(String(formData.get('payload') ?? '{}'));
  } catch {
    return { ok: false, message: 'Invalid data — please refresh and try again.' };
  }

  const {
    title, schoolName, schoolLogo, teacherName, teacherEmail, travelDates,
    validity, pupils, staff, notes, currency, itinerary, images, terms, status, lines,
  } = payload;
  if (!title?.trim()) return { ok: false, message: 'The quote needs a title.' };

  const { error } = await db
    .from('quotes')
    .update({
      title: title.trim(),
      school_name: schoolName?.trim() || null,
      school_logo: schoolLogo?.trim() || null,
      teacher_name: teacherName?.trim() || null,
      teacher_email: teacherEmail?.trim() || null,
      travel_dates: travelDates?.trim() || null,
      validity: validity || null,
      pupils: pupils === '' || pupils === null ? null : Number(pupils),
      staff: staff === '' || staff === null ? null : Number(staff),
      notes: notes?.trim() || null,
      currency: currency?.trim() || 'AED',
      itinerary: Array.isArray(itinerary) ? itinerary : [],
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      terms: Array.isArray(terms) ? terms.filter(Boolean) : [],
      status: ['draft', 'published', 'accepted', 'declined', 'expired'].includes(status) ? status : 'draft',
    })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };

  await db.from('quote_lines').delete().eq('quote_id', id);
  const cleanLines = (Array.isArray(lines) ? lines : []).filter((l: any) => l.description?.trim());
  if (cleanLines.length > 0) {
    const { error: linesError } = await db.from('quote_lines').insert(
      cleanLines.map((l: any, i: number) => ({
        quote_id: id,
        sort_order: i,
        description: String(l.description).trim(),
        qty: Number(l.qty) || 0,
        unit_cost: Number(l.unitCost) || 0,
        markup_pct: Number(l.markupPct) || 0,
      }))
    );
    if (linesError) return { ok: false, message: linesError.message };
  }

  revalidatePath(`/admin/school-trips/quotes/${id}`);
  revalidatePath('/admin/school-trips/quotes');
  return { ok: true, message: 'Quote saved to the School Trips platform.' };
}

export async function deleteStQuote(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const db = pcstClient();
  await db.from('quote_lines').delete().eq('quote_id', id);
  await db.from('quotes').delete().eq('id', id);
  redirect('/admin/school-trips/quotes');
}

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
