'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { getAccount } from '@/lib/account';
import { describeRejection, guardPayloadFromForm, guardSubmission, remoteIpFrom } from '@/lib/spam-guard';

export type AccountState = { ok: boolean; message: string } | null;

/**
 * Sign in by emailed link.
 *
 * No passwords: nothing to store, nothing to leak, nothing for a customer to
 * reset at eleven at night. Signing in and signing up are the same action —
 * Supabase creates the account if the address is new — which suits people who
 * enquired months ago and have never thought of themselves as having an
 * account here.
 */
export async function requestSignInLink(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const next = String(formData.get('next') ?? '/account').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'That email address doesn’t look right.' };
  if (!isSupabaseConfigured()) return { ok: false, message: 'Sign-in is not available right now.' };

  // Bots, before any email goes out. Every submit here makes Supabase send a
  // link to whatever address was typed; a bot typing scraped addresses had
  // Supabase warning that its sender was about to be cut off for bounces.
  // A silent rejection gets the same "on its way" as everyone, so it learns
  // nothing — and no email is sent.
  const verdict = await guardSubmission({
    ...guardPayloadFromForm(formData),
    fields: [],
    remoteIp: remoteIpFrom(headers().get('x-forwarded-for')),
  });
  if (!verdict.ok) {
    console.warn(describeRejection(verdict, 'sign-in link', email));
    return verdict.silent ? { ok: true, message: SENT(email) } : { ok: false, message: verdict.message };
  }

  // Come back to the site they signed in from, not to the master one. A
  // Supabase session is a cookie and cookies do not cross domains, so landing
  // someone on premiumchoicetravel.com after they asked to sign in from
  // Staycations would leave them signed out where they actually were.
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

  if (error) {
    console.error('[account] sign-in link', error.status, error.message);
    // The mailer limits how many links can go out in an hour. Saying "try
    // again" to someone who has already tried twice is the wrong advice.
    if (error.status === 429) {
      return {
        ok: false,
        message: 'Too many sign-in links have been requested just now. Wait a few minutes and try again, or call us on +971 4 420 6965.',
      };
    }
    return { ok: false, message: 'We could not send that link — please try again, or call us.' };
  }

  // Deliberately the same words whether or not the address is known to us:
  // otherwise this form quietly tells a stranger who has an account here.
  return { ok: true, message: SENT(email) };
}

/** The same words whether or not the address is known — or wanted. */
const SENT = (email: string) =>
  `If we can reach you at ${email}, a sign-in link is on its way. It works once and lasts an hour.`;

export async function signOutAccount() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}

/** Name and phone, kept so a customer does not retype them on every request. */
export async function saveAccountDetails(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const account = await getAccount();
  if (!account) return { ok: false, message: 'Please sign in again.' };

  const fullName = String(formData.get('full_name') ?? '').trim().slice(0, 120);
  const phone = String(formData.get('phone') ?? '').trim().slice(0, 40);

  const db = createAdminClient();
  const { error } = await db
    .from('profiles')
    // Role is never taken from a form — a customer editing their own name must
    // not be able to promote themselves.
    .update({ full_name: fullName || null, phone: phone || null })
    .eq('id', account.id);

  if (error) {
    console.error('[account] save details', error.message);
    return { ok: false, message: 'Something went wrong — please try again.' };
  }
  revalidatePath('/account');
  return { ok: true, message: 'Saved.' };
}
