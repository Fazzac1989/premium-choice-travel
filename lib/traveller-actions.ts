'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getAccount } from '@/lib/account';

export type TravellerState = { ok: boolean; message: string } | null;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Save a traveller — theirs, always.
 *
 * customer_id is taken from the session and never from the form, and every
 * update is scoped to it, so a crafted request cannot read or overwrite
 * someone else's traveller by guessing an id.
 */
export async function saveTraveller(_prev: TravellerState, formData: FormData): Promise<TravellerState> {
  const account = await getAccount();
  if (!account) return { ok: false, message: 'Please sign in again.' };
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not available right now.' };

  const id = formData.get('id') ? Number(formData.get('id')) : null;
  const fullName = String(formData.get('full_name') ?? '').trim().slice(0, 120);
  if (!fullName) return { ok: false, message: 'Add the name exactly as it appears in the passport.' };

  const dob = String(formData.get('date_of_birth') ?? '').trim();
  const expiry = String(formData.get('passport_expiry') ?? '').trim();
  if (dob && !DATE.test(dob)) return { ok: false, message: 'That date of birth doesn’t look right.' };
  if (expiry && !DATE.test(expiry)) return { ok: false, message: 'That passport expiry doesn’t look right.' };

  const row = {
    customer_id: account.id,
    full_name: fullName,
    label: String(formData.get('label') ?? '').trim().slice(0, 40) || null,
    date_of_birth: dob || null,
    nationality: String(formData.get('nationality') ?? '').trim().slice(0, 60) || null,
    passport_number: String(formData.get('passport_number') ?? '').trim().slice(0, 40) || null,
    passport_expiry: expiry || null,
    passport_country: String(formData.get('passport_country') ?? '').trim().slice(0, 60) || null,
    notes: String(formData.get('notes') ?? '').trim().slice(0, 500) || null,
    updated_at: new Date().toISOString(),
  };

  const db = createAdminClient();
  const { error } = id
    ? await db.from('travellers').update(row).eq('id', id).eq('customer_id', account.id)
    : await db.from('travellers').insert(row);

  if (error) {
    // Never log the row — it carries passport details.
    console.error('[travellers] save failed', error.message);
    return { ok: false, message: 'Something went wrong — please try again.' };
  }

  revalidatePath('/account/travellers');
  return { ok: true, message: id ? 'Saved.' : `${fullName} added.` };
}

export async function deleteTraveller(formData: FormData) {
  const account = await getAccount();
  if (!account) return;
  const id = Number(formData.get('id'));
  if (!id) return;

  const db = createAdminClient();
  await db.from('travellers').delete().eq('id', id).eq('customer_id', account.id);
  revalidatePath('/account/travellers');
}
