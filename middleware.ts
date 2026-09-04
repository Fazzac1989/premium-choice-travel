import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { BRANDS } from '@/lib/brands';

/**
 * Two jobs:
 *  1. Multi-domain routing — each brand's own domain serves its own website
 *     (rewritten to /sites/<brand-slug>/…) from this one codebase and admin.
 *  2. Admin session guard on the master site.
 */

function brandForHost(hostHeader: string | null) {
  if (!hostHeader) return null;
  const host = hostHeader.toLowerCase().split(':')[0].replace(/^www\./, '');
  return BRANDS.find((b) => b.domains.includes(host)) ?? null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Brand domains ─────────────────────────────────────────────
  const brand = brandForHost(request.headers.get('host'));
  if (brand) {
    // Admin always lives on the master site.
    if (pathname.startsWith('/admin')) {
      const master = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://premium-choice-travel.vercel.app';
      return NextResponse.redirect(`${master}${pathname}`);
    }
    // Shared endpoints pass straight through on any domain.
    //
    // /account and /auth are shared deliberately rather than redirected to the
    // master site: a Supabase session is a cookie, and cookies do not cross
    // domains. Sending someone to premiumchoicetravel.com to sign in would
    // leave them signed out on the brand site they were actually booking from.
    const passthrough =
      pathname.startsWith('/api') ||
      pathname.startsWith('/quotes') ||
      pathname.startsWith('/account') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/sites') ||
      pathname.startsWith('/images') ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      // Installable-app files: the manifest is host-aware, the worker is static.
      pathname === '/manifest.webmanifest' ||
      pathname === '/sw.js';
    if (!passthrough) {
      const url = request.nextUrl.clone();
      url.pathname = `/sites/${brand.slug}${pathname === '/' ? '' : pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // ── Master site: admin guard ──────────────────────────────────
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return new NextResponse(
      'Admin unavailable: Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY — see README.',
      { status: 503 }
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = pathname.startsWith('/admin/login');

  // A session is enough: this app has its own Supabase project containing only
  // Premium Choice staff. School Trips teachers live in a separate project that
  // this app reaches only via service-role credentials, never by signing in.
  if (!isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }
  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|images/).*)'],
};
