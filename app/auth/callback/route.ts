import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { claimActivity, getAccount } from '@/lib/account';

export const dynamic = 'force-dynamic';

/**
 * Where an emailed sign-in link lands.
 *
 * On the way through, anything the customer sent us before they had an account
 * is attached to it by their now-verified email address — so someone who
 * enquired in March finds it waiting the first time they sign in.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';
  // Only ever redirect within this site.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  if (!code) {
    return NextResponse.redirect(new URL('/account/sign-in?error=link', url.origin));
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth] callback', error.message);
    return NextResponse.redirect(new URL('/account/sign-in?error=expired', url.origin));
  }

  try {
    const account = await getAccount();
    if (account) await claimActivity(account);
  } catch (e: any) {
    // A failure here must not block the sign-in; the dashboard still finds
    // past activity by email even when nothing was claimed.
    console.error('[auth] claim', e?.message);
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
