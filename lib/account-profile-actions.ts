'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getAccount } from '@/lib/account';

/**
 * The details we ask for once, at the first booking, and never again.
 *
 * A hotel checks people in against the passport, so the name has to be the
 * passport name and the date of birth has to be real. Asking for both here,
 * once, is what makes every later booking a matter of choosing a name from a
 * list rather than typing it at midnight.
 *
 * Everything is written against the session's own account id. Nothing in the
 * form decides whose record this is.
 */

export type ProfileState = { ok: boolean; message: string } | null;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_YEAR = 1900;

function checkDob(value: string, who: string): string | null {
  if (!DATE.test(value)) return `Add ${who} date of birth as a real date.`;
  const t = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(t)) return `That date of birth doesn’t look right.`;
  const year = Number(value.slice(0, 4));
  if (year < MIN_YEAR) return `That date of birth doesn’t look right.`;
  if (t > Date.now()) return `A date of birth cannot be in the future.`;
  return null;
}

export async function saveBookingProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const account = await getAccount();
  if (!account) return { ok: false, message: 'Your session has expired. Ask for a new sign-in link.' };
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not available right now.' };

  const fullName = String(formData.get('full_name') ?? '').trim().slice(0, 120);
  if (fullName.length < 2) return { ok: false, message: 'Add your name exactly as it appears in your passport.' };

  const dob = String(formData.get('date_of_birth') ?? '').trim();
  const dobError = checkDob(dob, 'your');
  if (dobError) return { ok: false, message: dobError };

  const phone = String(formData.get('phone') ?? '').trim().slice(0, 40);
  const nationality = String(formData.get('nationality') ?? '').trim().slice(0, 60);

  // The optional second traveller. Given a name, the date of birth comes too:
  // a hotel prices and checks in a second guest on both.
  const companionName = String(formData.get('companion_name') ?? '').trim().slice(0, 120);
  const companionDob = String(formData.get('companion_dob') ?? '').trim();
  if (companionName && companionName.length < 2) {
    return { ok: false, message: 'Add the second traveller’s name as it appears in their passport, or leave it blank.' };
  }
  if (companionName) {
    const e = checkDob(companionDob, 'their');
    if (e) return { ok: false, message: e };
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  const { error: profileError } = await db
    .from('profiles')
    .update({ full_name: fullName, ...(phone ? { phone } : {}) })
    .eq('id', account.id);
  if (profileError) {
    console.error('[profile] save failed', profileError.message);
    return { ok: false, message: 'Something went wrong — please try again.' };
  }

  // Their own traveller record. Matched on the label first, then the name, so
  // saving twice corrects the row rather than making a second copy of them.
  const { data: mine } = await db.from('travellers').select('id, label, full_name').eq('customer_id', account.id);
  const self = (mine ?? []).find((t: any) => t.label === 'Me') ?? (mine ?? []).find((t: any) => t.full_name === fullName);
  const selfRow = {
    customer_id: account.id,
    full_name: fullName,
    label: 'Me',
    date_of_birth: dob,
    ...(nationality ? { nationality } : {}),
    updated_at: now,
  };
  const { error: selfError } = self
    ? await db.from('travellers').update(selfRow).eq('id', self.id).eq('customer_id', account.id)
    : await db.from('travellers').insert(selfRow);
  if (selfError) {
    console.error('[profile] traveller save failed', selfError.message);
    return { ok: false, message: 'Something went wrong — please try again.' };
  }

  if (companionName) {
    const existing = (mine ?? []).find((t: any) => t.full_name === companionName);
    const row = {
      customer_id: account.id,
      full_name: companionName,
      date_of_birth: companionDob,
      updated_at: now,
    };
    const { error } = existing
      ? await db.from('travellers').update(row).eq('id', existing.id).eq('customer_id', account.id)
      : await db.from('travellers').insert(row);
    if (error) {
      console.error('[profile] companion save failed', error.message);
      return { ok: false, message: 'Your details were saved, but the second traveller was not. Add them from your account.' };
    }
  }

  revalidatePath('/account/travellers');
  return {
    ok: true,
    message: companionName ? `Saved. ${fullName} and ${companionName} are on your account.` : 'Saved.',
  };
}
