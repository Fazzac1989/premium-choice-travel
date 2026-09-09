import { NextRequest, NextResponse } from 'next/server';
import { BRANDS } from '@/lib/brands';

/**
 * Web app manifest, chosen by host. The Staycations site is installable as
 * an app that opens straight on the hotel list; the other domains get a
 * plain manifest so the link in their <head> never 404s.
 */
export const dynamic = 'force-dynamic';

const ICONS = [
  { src: '/images/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/images/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: '/images/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export function GET(req: NextRequest) {
  const host = req.headers.get('host')?.toLowerCase().split(':')[0].replace(/^www\./, '') ?? '';
  const brand = BRANDS.find((b) => b.domains.includes(host));

  const manifest =
    brand?.slug === 'staycations'
      ? {
          id: '/',
          name: 'Premium Choice Staycations',
          short_name: 'Staycations',
          description: 'UAE hotels our specialists actually book — pick a weekend, save favourites, ask for a quote.',
          start_url: '/?source=app',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#EAF3F4',
          theme_color: '#164B57',
          lang: 'en',
          icons: ICONS,
          shortcuts: [
            { name: 'Find a stay', url: '/hotels', description: 'Search UAE hotels for your dates' },
            { name: 'Saved', url: '/saved' },
            { name: 'Trips', url: '/trips' },
          ],
        }
      : {
          name: brand?.name ?? 'Premium Choice Travel',
          short_name: brand?.shortName ?? 'Premium Choice',
          start_url: '/',
          scope: '/',
          display: 'browser',
          background_color: '#FFFFFF',
          theme_color: '#16242E',
          icons: ICONS,
        };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
