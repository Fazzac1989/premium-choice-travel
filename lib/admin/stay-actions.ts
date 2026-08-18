'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';

export type StayActionState = { ok: boolean; message: string } | null;

export async function saveHotel(_prev: StayActionState, formData: FormData): Promise<StayActionState> {
  await requireAdmin();
  const db = createAdminClient();
  const id = formData.get('id') ? Number(formData.get('id')) : null;
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { ok: false, message: 'A name is required.' };

  const parseJson = <T,>(v: FormDataEntryValue | null, fallback: T): T => {
    if (typeof v !== 'string' || !v) return fallback;
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  };

  const basicRow = {
    name,
    destination_id: formData.get('destination_id') ? Number(formData.get('destination_id')) : null,
    area: String(formData.get('area') ?? '').trim() || null,
    style: String(formData.get('style') ?? '').trim() || null,
    description: String(formData.get('description') ?? '').trim() || null,
    image: String(formData.get('image') ?? '').trim() || null,
    sort_order: Number(formData.get('sort_order') ?? 0) || 0,
  };
  const row = {
    ...basicRow,
    intro: parseJson<string[]>(formData.get('intro'), []),
    features: parseJson<string[]>(formData.get('features'), []),
    room_types: parseJson<{ heading: string; body: string }[]>(formData.get('room_types'), []),
    restaurants: parseJson<{ heading: string; body: string }[]>(formData.get('restaurants'), []),
    meal_plans: parseJson<string[]>(formData.get('meal_plans'), []),
    getting_there: String(formData.get('getting_there') ?? '').trim() || null,
    transfer_duration: String(formData.get('transfer_duration') ?? '').trim() || null,
    gallery: parseJson<string[]>(formData.get('gallery'), []),
  };

  let { error } = await (id ? db.from('hotels').update(row).eq('id', id) : db.from('hotels').insert(row));
  if (error && /column|schema cache/i.test(error.message)) {
    // Detail columns not migrated yet — save the basics and flag it.
    const retry = await (id ? db.from('hotels').update(basicRow).eq('id', id) : db.from('hotels').insert(basicRow));
    if (!retry.error) {
      return {
        ok: false,
        message: 'Saved the basics, but the detail sections need the database migration (supabase/RUN-ME.sql) before they can be stored.',
      };
    }
    error = retry.error;
  }
  if (error) {
    return /relation .* does not exist/i.test(error.message)
      ? { ok: false, message: 'The hotels table isn’t migrated yet — run supabase/RUN-ME.sql first.' }
      : { ok: false, message: error.message };
  }
  revalidatePath('/admin/hotels');
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function deleteHotel(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const db = createAdminClient();
  await db.from('hotels').delete().eq('id', id);
  revalidatePath('/admin/hotels');
}

export async function saveExperience(_prev: StayActionState, formData: FormData): Promise<StayActionState> {
  await requireAdmin();
  const db = createAdminClient();
  const id = formData.get('id') ? Number(formData.get('id')) : null;
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ok: false, message: 'A title is required.' };

  const row = {
    title,
    destination_id: formData.get('destination_id') ? Number(formData.get('destination_id')) : null,
    body: String(formData.get('body') ?? '').trim() || null,
    image: String(formData.get('image') ?? '').trim() || null,
    sort_order: Number(formData.get('sort_order') ?? 0) || 0,
  };
  const { error } = await (id ? db.from('experiences').update(row).eq('id', id) : db.from('experiences').insert(row));
  if (error) {
    return /relation .* does not exist|schema cache/i.test(error.message)
      ? { ok: false, message: 'The experiences table isn’t migrated yet — run supabase/RUN-ME.sql first.' }
      : { ok: false, message: error.message };
  }
  revalidatePath('/admin/experiences');
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function deleteExperience(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  const db = createAdminClient();
  await db.from('experiences').delete().eq('id', id);
  revalidatePath('/admin/experiences');
}
