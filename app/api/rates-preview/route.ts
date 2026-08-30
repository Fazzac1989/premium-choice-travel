import { NextResponse } from 'next/server';
import { RATES_PREVIEW_COOKIE } from '@/lib/rates';

export const dynamic = 'force-dynamic';

/**
 * Turn live prices on for one browser.
 *
 * Lets the team use the booking flow on the real website while the supplier
 * key is still a sandbox one, without customers meeting prices we may not be
 * able to honour. Visit /api/rates-preview?key=… to switch it on for this
 * browser, and ?off=1 to switch it back off.
 *
 * When RATES_PUBLIC=1 is set the cookie stops mattering — everyone sees it.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.RATES_PREVIEW_KEY;
  const home = new URL('/hotels', url.origin);

  if (url.searchParams.get('off') === '1') {
    const res = NextResponse.redirect(home);
    res.cookies.delete(RATES_PREVIEW_COOKIE);
    return res;
  }

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'RATES_PREVIEW_KEY is not set on this deployment.' },
      { status: 503 },
    );
  }
  if (url.searchParams.get('key') !== secret) {
    return NextResponse.json({ ok: false, error: 'Wrong key.' }, { status: 401 });
  }

  const res = NextResponse.redirect(home);
  res.cookies.set(RATES_PREVIEW_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
