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

/** Everything the AI extraction writes onto a day, cleared when its source changes. */
const STRUCTURED_COLUMNS = {
  display_title: null,
  summary: null,
  primary_location: null,
  highlights: [],
  learning_focus: [],
  experience_types: [],
  locations: [],
  meals: [],
  transport: [],
  notices: [],
  review_flags: [],
  structured_at: null,
  structured_model: null,
};

type IncomingDay = { label: string; title: string; description: string; imageUrl?: string | null };

/**
 * Write the itinerary without destroying the day summaries.
 *
 * These rows used to be deleted and re-inserted on every save, which silently
 * threw away the AI-extracted layer — display title, summary, location,
 * highlights — so saving a trip after building its summaries dropped the public
 * page back to the plain day list. Rows are now updated in place.
 *
 * Days are matched to existing rows by their description, so reordering the
 * itinerary carries each summary with its day rather than leaving them behind
 * at the old positions. A day whose description was edited has its structured
 * layer cleared, because that summary describes text that no longer exists —
 * the trip page renders that one day plainly and the banner asks for a rebuild.
 */
async function saveItineraryDays(
  db: ReturnType<typeof pcstClient>,
  tripId: number,
  itinerary: IncomingDay[]
): Promise<string | null> {
  const { data: existing } = await db
    .from('itinerary_days')
    .select('id, sort_order, description, image_url, image_alt')
    .eq('trip_id', tripId)
    .order('sort_order');

  const rows = existing ?? [];
  const unclaimed = new Set(rows.map((r: any) => r.id));
  const key = (s: string | null | undefined) => (s ?? '').trim();

  const byDescription = new Map<string, any>();
  for (const r of rows) {
    const k = key(r.description);
    if (k && !byDescription.has(k)) byDescription.set(k, r);
  }

  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i];
    const viaDescription = byDescription.get(key(day.description));
    const match =
      viaDescription && unclaimed.has(viaDescription.id)
        ? viaDescription
        : rows.find((r: any) => r.sort_order === i && unclaimed.has(r.id)) ?? null;

    const patch: Record<string, unknown> = {
      trip_id: tripId,
      sort_order: i,
      label: day.label,
      title: day.title,
      description: day.description,
      // The form carries the image now; older saves fall back to what was there.
      image_url: day.imageUrl !== undefined ? day.imageUrl?.trim() || null : match?.image_url ?? null,
      image_alt: match?.image_alt ?? null,
    };

    if (match) {
      unclaimed.delete(match.id);
      if (key(match.description) !== key(day.description)) Object.assign(patch, STRUCTURED_COLUMNS);
      const { error } = await db.from('itinerary_days').update(patch).eq('id', match.id);
      if (error) return error.message;
    } else {
      const { error } = await db.from('itinerary_days').insert(patch);
      if (error) return error.message;
    }
  }

  // Days the editor removed.
  if (unclaimed.size > 0) {
    const { error } = await db.from('itinerary_days').delete().in('id', Array.from(unclaimed));
    if (error) return error.message;
  }
  return null;
}

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

  const itinerary = parseJson<{ label: string; title: string; description: string; imageUrl?: string | null }[]>(
    formData.get('itinerary'),
    []
  ).filter((d) => d.label.trim() || d.title.trim() || d.description.trim());

  const dayError = await saveItineraryDays(db, tripId!, itinerary);
  if (dayError) return { ok: false, message: `Trip saved, but itinerary failed: ${dayError}` };

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
