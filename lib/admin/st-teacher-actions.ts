'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';

/**
 * Teacher accounts for the School Trips portal.
 *
 * The portal is invite-only: there is no public sign-up. Creating an invite
 * returns a single-use link for you to send yourself, so no email service has
 * to be configured for a teacher to get access.
 *
 * These accounts live in the School Trips Supabase project, reached with its
 * service-role key. That key is what allows auth.admin here — a teacher can
 * never obtain a session in this console.
 */

export type TeacherResult = { ok: true; link?: string } | { ok: false; error: string };

/** The confirm page is on the School Trips site, not this one. */
const confirmUrl = (token: string, type: 'invite' | 'recovery') =>
  `${PCST_SITE_URL}/portal/confirm?token_hash=${token}&type=${type}`;

export async function inviteStTeacher(input: {
  name: string;
  email: string;
  schoolName: string;
}): Promise<TeacherResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const schoolName = input.schoolName.trim();
  if (!name || !schoolName) return { ok: false, error: 'Name and school are both required.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'That email looks wrong.' };

  const db = pcstClient();

  const { data: existing } = await db
    .from('portal_teachers')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) return { ok: false, error: 'That teacher has already been invited.' };

  // generateLink creates the auth user and hands back a token we build a URL
  // from, so the invite can be sent however you like.
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: 'invite',
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return { ok: false, error: linkError?.message ?? 'Could not create the invite.' };
  }

  const { error } = await db.from('portal_teachers').insert({
    email,
    name,
    school_name: schoolName,
    user_id: linkData.user?.id ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/school-trips/teachers');
  return { ok: true, link: confirmUrl(linkData.properties.hashed_token, 'invite') };
}

/** Fresh link for a teacher who lost theirs or needs a password reset. */
export async function resendStTeacherInvite(id: number): Promise<TeacherResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const db = pcstClient();
  const { data: teacher } = await db
    .from('portal_teachers')
    .select('email, status')
    .eq('id', id)
    .maybeSingle();
  if (!teacher) return { ok: false, error: 'Teacher not found.' };

  // An accepted account needs a recovery link; a pending one needs the invite.
  const type = teacher.status === 'active' ? 'recovery' : 'invite';
  const { data, error } = await db.auth.admin.generateLink({ type, email: teacher.email });
  if (error || !data?.properties?.hashed_token) {
    return { ok: false, error: error?.message ?? 'Could not create the link.' };
  }

  return { ok: true, link: confirmUrl(data.properties.hashed_token, type) };
}

export async function setStTeacherStatus(
  id: number,
  status: 'active' | 'disabled'
): Promise<TeacherResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const { error } = await pcstClient().from('portal_teachers').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/school-trips/teachers');
  return { ok: true };
}

export async function deleteStTeacher(id: number): Promise<TeacherResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const db = pcstClient();
  const { data: teacher } = await db
    .from('portal_teachers')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await db.from('portal_teachers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  // Remove the login too, so the address can be re-invited cleanly.
  if (teacher?.user_id) {
    try {
      await db.auth.admin.deleteUser(teacher.user_id);
    } catch {
      // The record is already gone; a stranded auth user is not worth failing on.
    }
  }

  revalidatePath('/admin/school-trips/teachers');
  return { ok: true };
}
