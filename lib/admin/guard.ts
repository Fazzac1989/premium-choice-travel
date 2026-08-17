import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** Throws unless a signed-in admin session exists. Call at the top of every admin action. */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authorised');
  return user;
}
