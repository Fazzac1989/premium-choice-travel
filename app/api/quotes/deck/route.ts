import { NextResponse, type NextRequest } from 'next/server';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { getQuoteByToken } from '@/lib/quotes';
import QuoteDeck from '@/lib/pdf/quote-deck';

/**
 * The same quote as a sales presentation: 16:9 slides to walk a client through,
 * rather than the document they read afterwards.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Storage keeps photography at full resolution; a deck is mostly full-bleed
 * imagery, so resize on the way in or the file balloons.
 */
function deckImage(url: string, width: number): string {
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  return `${url.replace(marker, '/storage/v1/render/image/public/')}?width=${width}&quality=72`;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const quote = await getQuoteByToken(token);
  if (!quote) return NextResponse.json({ ok: false, error: 'Quote not found' }, { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;

  const sized = {
    ...quote,
    heroImage: quote.heroImage ? deckImage(quote.heroImage, 1600) : null,
    images: quote.images.map((url) => deckImage(url, 900)),
  };

  try {
    const buffer = await renderToBuffer(
      createElement(QuoteDeck, { quote: sized, siteUrl }) as any
    );
    const name = `${quote.ref} - ${quote.title.replace(/[^\w\s-]/g, '').trim()} - presentation.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    console.error('[quote deck]', quote.ref, e?.message);
    return NextResponse.json({ ok: false, error: 'Presentation generation failed' }, { status: 500 });
  }
}
