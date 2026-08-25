import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * One codebase serves six domains, so robots.txt has to answer for whichever
 * host asked. Pointing every brand at the master site's sitemap sends Google a
 * cross-domain reference it ignores, and leaves the brand's own pages with no
 * sitemap at all.
 *
 * The vercel.app deployment domain is a complete copy of every site. Left
 * open it competes with the real domains for the same content, so it is closed
 * to crawlers entirely.
 */
export default function robots(): MetadataRoute.Robots {
  const host = headers().get('host')?.toLowerCase().split(':')[0] ?? '';
  const isPreview = host.endsWith('.vercel.app') || host === 'localhost';

  if (isPreview) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/quotes/', '/api/'] }],
    sitemap: `https://${host}/sitemap.xml`,
    host: `https://${host}`,
  };
}
