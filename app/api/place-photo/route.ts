import { NextRequest, NextResponse } from 'next/server';
import { getPhotoUri, isPlacesConfigured } from '@/lib/images/google-places';

/**
 * Streams a Google Places photo so the API key never reaches the browser.
 * Google allows short-lived caching of its content, so we cache at the edge
 * for a day and let the nightly refresh script keep the handles current.
 */
export const runtime = 'nodejs';

const ALLOWED_WIDTHS = [400, 800, 1200, 1600, 2400];

export async function GET(req: NextRequest) {
  if (!isPlacesConfigured()) {
    return NextResponse.json({ error: 'Places is not configured' }, { status: 503 });
  }

  const name = req.nextUrl.searchParams.get('name');
  // Photo handles look like places/<id>/photos/<ref> — anything else is not ours.
  if (!name || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_\-.]+$/.test(name)) {
    return NextResponse.json({ error: 'Bad photo reference' }, { status: 400 });
  }

  const asked = Number(req.nextUrl.searchParams.get('w')) || 1600;
  const width = ALLOWED_WIDTHS.reduce((a, b) => (Math.abs(b - asked) < Math.abs(a - asked) ? b : a));

  try {
    const uri = await getPhotoUri(name, width);
    if (!uri) return NextResponse.json({ error: 'Photo unavailable' }, { status: 404 });

    const image = await fetch(uri, { cache: 'no-store' });
    if (!image.ok || !image.body) {
      return NextResponse.json({ error: 'Photo unavailable' }, { status: 502 });
    }

    return new NextResponse(image.body, {
      headers: {
        'Content-Type': image.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e: any) {
    console.error('[place-photo]', e?.message);
    return NextResponse.json({ error: 'Photo unavailable' }, { status: 502 });
  }
}
