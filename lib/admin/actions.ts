'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';

export type ActionState = { ok: boolean; message: string } | null;

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

// ─────────────────────────────────────────────── auth

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

// ─────────────────────────────────────────────── packages

export async function savePackage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const id = formData.get('id') ? Number(formData.get('id')) : null;
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ok: false, message: 'A title is required.' };

  const slugInput = String(formData.get('slug') ?? '').trim();
  const slug = slugify(slugInput || title);
  const priceRaw = String(formData.get('price_from') ?? '').trim();

  const brandRaw = String(formData.get('brand') ?? 'holidays');
  const row = {
    slug,
    title,
    tagline: String(formData.get('tagline') ?? '').trim() || null,
    brand: ['holidays', 'golf', 'cruises', 'staycations', 'corporate'].includes(brandRaw) ? brandRaw : 'holidays',
    destination_id: formData.get('destination_id') ? Number(formData.get('destination_id')) : null,
    category: String(formData.get('category') ?? '').trim() || null,
    nights: Number(formData.get('nights') ?? 0) || 0,
    days: Number(formData.get('days') ?? 0) || 0,
    price_from: priceRaw === '' ? null : Number(priceRaw),
    currency: String(formData.get('currency') ?? 'AED').trim() || 'AED',
    hero_image: String(formData.get('hero_image') ?? '').trim() || null,
    gallery: parseJson<string[]>(formData.get('gallery'), []),
    overview: parseJson<string[]>(formData.get('overview'), []),
    highlights: parseJson<string[]>(formData.get('highlights'), []),
    includes: parseJson<string[]>(formData.get('includes'), []),
    excludes: parseJson<string[]>(formData.get('excludes'), []),
    itinerary: parseJson<{ label: string; title: string; description: string }[]>(formData.get('itinerary'), []),
    hotel_name: String(formData.get('hotel_name') ?? '').trim() || null,
    board_basis: String(formData.get('board_basis') ?? '').trim() || null,
    featured: formData.get('featured') === 'on',
    status: ['draft', 'review', 'published'].includes(String(formData.get('status')))
      ? String(formData.get('status'))
      : 'draft',
  };
  const libraryFields = {
    tags: parseJson<string[]>(formData.get('tags'), []),
    who_for: parseJson<string[]>(formData.get('who_for'), []),
    why_works: parseJson<string[]>(formData.get('why_works'), []),
    extensions: parseJson<string[]>(formData.get('extensions'), []),
    details: parseJson<Record<string, unknown>>(formData.get('details'), {}),
    seasonal_notes: String(formData.get('seasonal_notes') ?? '').trim() || null,
    seo_title: String(formData.get('seo_title') ?? '').trim() || null,
    seo_description: String(formData.get('seo_description') ?? '').trim() || null,
    price_status: formData.get('price_status') === 'approved' ? 'approved' : 'on_request',
    review_note: String(formData.get('review_note') ?? '').trim() || null,
  };

  const fullRow = { ...row, ...libraryFields };
  let { error } = await (id
    ? db.from('packages').update(fullRow).eq('id', id)
    : db.from('packages').insert(fullRow));
  if (error && /column|schema cache|packages_status_check/i.test(error.message)) {
    // Library columns / review status not migrated yet — save what the schema allows.
    const legacyRow = { ...row, status: row.status === 'review' ? 'draft' : row.status };
    const retry = await (id
      ? db.from('packages').update(legacyRow).eq('id', id)
      : db.from('packages').insert(legacyRow));
    if (!retry.error) {
      return {
        ok: false,
        message: 'Saved the basics, but the journey-library fields need the database migration (supabase/RUN-ME.sql) before they can be stored.',
      };
    }
    error = retry.error;
  }
  if (error) {
    const message = error.message.includes('duplicate')
      ? `The slug "${slug}" is already in use — choose another.`
      : error.message;
    return { ok: false, message };
  }

  revalidatePath('/', 'layout');
  redirect('/admin/packages?saved=1');
}

export async function deletePackage(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const db = createAdminClient();
  await db.from('packages').delete().eq('id', id);
  revalidatePath('/', 'layout');
  redirect('/admin/packages');
}

// ─────────────────────────────────────────────── destinations

export async function saveDestination(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const id = formData.get('id') ? Number(formData.get('id')) : null;
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { ok: false, message: 'A name is required.' };

  const row = {
    slug: slugify(String(formData.get('slug') ?? '').trim() || name),
    name,
    region: String(formData.get('region') ?? '').trim() || null,
    blurb: String(formData.get('blurb') ?? '').trim() || null,
    hero_image: String(formData.get('hero_image') ?? '').trim() || null,
    featured: formData.get('featured') === 'on',
    sort_order: Number(formData.get('sort_order') ?? 0) || 0,
    intro: parseJson<string[]>(formData.get('intro'), []),
    when_to_travel: parseJson<{ heading: string; body: string }[]>(formData.get('when_to_travel'), []),
    culture: parseJson<{ heading: string; body: string }[]>(formData.get('culture'), []),
  };

  let { error } = await (id
    ? db.from('destinations').update(row).eq('id', id)
    : db.from('destinations').insert(row));
  if (error && /column|schema cache/i.test(error.message)) {
    // Guide columns not migrated yet — save the basics and flag it.
    const { intro: _i, when_to_travel: _w, culture: _c, ...basic } = row;
    const retry = await (id
      ? db.from('destinations').update(basic).eq('id', id)
      : db.from('destinations').insert(basic));
    if (!retry.error) {
      return {
        ok: false,
        message: 'Saved the basics, but the guide sections need the database migration (supabase/RUN-ME.sql) before they can be stored.',
      };
    }
    error = retry.error;
  }
  if (error) return { ok: false, message: error.message };

  revalidatePath('/', 'layout');
  redirect('/admin/destinations?saved=1');
}

export async function deleteDestination(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const db = createAdminClient();
  await db.from('destinations').delete().eq('id', id);
  revalidatePath('/', 'layout');
  redirect('/admin/destinations');
}

// ─────────────────────────────────────────────── enquiries

export async function setEnquiryStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const status = String(formData.get('status'));
  if (!id || !['new', 'contacted', 'closed'].includes(status)) return;
  const db = createAdminClient();
  await db.from('enquiries').update({ status }).eq('id', id);
  revalidatePath('/admin/enquiries');
}
