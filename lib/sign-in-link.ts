import 'server-only';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/admin';

/**
 * Send somebody a link that signs them in, creating the account if the address
 * is new.
 *
 * Shared by the sign-in form and the enquiry form. It deliberately does no spam
 * checking of its own: both callers guard their own submission first, and a
 * second guard here would reject the enquiry path for having no honeypot of its
 * own. Nothing here decides whether sending is appropriate — the caller does.
 */
export type LinkResult = { ok: true } | { ok: false; reason: 'rate_limited' | 'failed' | 'off' };

export async function sendSignInLink(email: string, next: string): Promise<LinkResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: 'off' };

  // Come back to the site they were on, not the master one. A Supabase session
  // is a cookie and cookies do not cross domains, so landing someone on
  // premiumchoicetravel.com would leave them signed out where they actually were.
  const host = headers().get('host') ?? '';
  const site = host
    ? `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`
    : process.env.NEXT_PUBLIC_SITE_URL || 'https://www.premiumchoicetravel.com';

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${site}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  if (!error) return { ok: true };
  console.error('[sign-in link]', error.status, error.message);
  return { ok: false, reason: error.status === 429 ? 'rate_limited' : 'failed' };
}
