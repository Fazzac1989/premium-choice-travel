import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadPackageBrochure } from '@/lib/package-brochure/data';
import { isStale, renderPdf, signedPdfUrl } from '@/lib/package-brochure/pdf';

/**
 * The brochure PDF.
 *
 * Authorisation is the page's own: loadPackageBrochure applies the same rules,
 * so a brochure that cannot be read at /brochures/<slug> cannot be downloaded
 * here either.
 *
 * GET redirects a reader to the file. POST forces a re-render, which is what
 * the studio calls after an edit.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A cold Chromium launch plus a full render does not fit in ten seconds.
export const maxDuration = 60;

async function resolve(req: NextRequest, slug: string, force: boolean) {
  const access = await loadPackageBrochure(slug);
  // Missing, draft and unreadable all answer the same way: a brochure nobody
  // may read should not confirm that it exists.
  if (access.state !== 'ok') return { status: 404, error: 'Not found' };

  const id = access.data.brochure.id;
  const db = createAdminClient();
  const { data: row } = await db
    .from('package_brochures')
    .select('id, updated_at, pdf_storage_path, pdf_generated_at')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { status: 404, error: 'Not found' };

  if (force || isStale(row)) {
    // In production the canonical site URL, because a Vercel deployment URL
    // is not where the fonts and images are cached. In development the server
    // doing the rendering, or a local run would print the live site instead of
    // the code being worked on.
    const origin =
      process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin
        : req.nextUrl.origin;
    const pageUrl = `${origin}/brochures/${encodeURIComponent(slug)}`;

    const result = await renderPdf(id, pageUrl);
    if (!result.ok) {
      // A failed render must not lose the last good file.
      if (row.pdf_storage_path) {
        const url = await signedPdfUrl(row.pdf_storage_path);
        if (url) return { status: 200, url, cached: true, warning: result.error };
      }
      return { status: 502, error: result.error };
    }
    const url = await signedPdfUrl(result.path);
    if (!url) return { status: 502, error: 'The file was rendered but could not be signed.' };
    return { status: 200, url, cached: false };
  }

  const url = await signedPdfUrl(row.pdf_storage_path!);
  if (!url) return { status: 502, error: 'The stored file could not be signed.' };
  return { status: 200, url, cached: true };
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const out = await resolve(req, params.slug, false);
  if (!('url' in out) || !out.url) {
    return NextResponse.json({ error: out.error }, { status: out.status });
  }
  // Send the reader to the file itself rather than proxying it through here.
  return NextResponse.redirect(out.url);
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const out = await resolve(req, params.slug, true);
  if (!('url' in out) || !out.url) {
    return NextResponse.json({ error: out.error }, { status: out.status });
  }
  return NextResponse.json({ url: out.url, cached: out.cached ?? false, warning: (out as any).warning });
}
