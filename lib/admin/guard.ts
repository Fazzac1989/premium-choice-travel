import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Throws unless a signed-in admin session exists. Call at the top of every
 * admin action.
 *
 * A session check is sufficient here: this app authenticates against its own
 * Supabase project, which contains only Premium Choice staff accounts. The
 * School Trips teacher portal lives in a separate project that this app reaches
 * only through the service-role PCST_* credentials, so a teacher login cannot
 * produce a session here.
 */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authorised');
  return user;
}
