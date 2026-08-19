import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Throws unless a signed-in ADMIN session exists. Call at the top of every
 * admin action.
 *
 * The role check is not optional. This Supabase project is shared with the
 * School Trips teacher portal, whose teachers are ordinary auth users. A
 * session check alone would let any teacher into this admin — and once the
 * school-trips tools live here, that includes student passport copies and
 * medical notes.
 */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authorised');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') throw new Error('Not authorised');

  return user;
}

/** Non-throwing variant, for layouts that render a message rather than crash. */
export async function getAdminUser() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}
