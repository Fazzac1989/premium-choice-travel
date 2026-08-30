import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { claimActivity, getAccount } from '@/lib/account';

export const dynamic = 'force-dynamic';

/**
 * Where an emailed sign-in link lands.
 *
 * Two ways in, because people do not read email where they asked for it.
 *
 * A `code` is the PKCE flow: the browser that asked for the link holds a
 * verifier cookie, so it only works on the same device. Someone who requests
 * a link on their laptop and opens it on their phone — which is most people —
 * would be turned away.
 *
 * A `token_hash` is verified against the server instead, so it works from any
 * device. It is the preferred path; the code path stays for links already in
 * inboxes.
 *
 * On the way through, anything the customer sent us before they had an account
 * is attached to it by their now-verified email address.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') ?? '/account';
  // Only ever redirect within this site.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  const supabase = createClient();
  let failed: string | null = null;

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: (type as any) || 'magiclink',
      token_hash: tokenHash,
    });
    if (error) failed = error.message;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) failed = error.message;
  } else {
    return NextResponse.redirect(new URL('/account/sign-in?error=link', url.origin));
  }

  if (failed) {
    console.error('[auth] callback', failed);
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
