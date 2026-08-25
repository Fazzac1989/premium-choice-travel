import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getDestinations, getPublishedPackages, getStaycationHotels, hotelSlug } from '@/lib/data';
import { BRANDS } from '@/lib/brands';

export const dynamic = 'force-dynamic';

type Entry = MetadataRoute.Sitemap[number];

/**
 * A sitemap per domain, not one sitemap repeated on six of them.
 *
 * Every brand site is served from this codebase, so the host decides what the
 * sitemap should contain: on premiumchoicestaycations.com it is that brand's
 * own pages at that brand's own URLs, and on the master site it is the group
 * pages. A sitemap listing another domain's URLs is ignored by Google, which
 * is what was happening while every host emitted NEXT_PUBLIC_SITE_URL.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = headers().get('host')?.toLowerCase().split(':')[0] ?? '';
  const bare = host.replace(/^www\./, '');
  const base = `https://${host}`;

  const brand = BRANDS.find((b) => b.domains.includes(bare)) ?? null;

  const [packages, destinations] = await Promise.all([getPublishedPackages(), getDestinations()]);

  // A brand's own website: its pages, at its own domain.
  if (brand) {
    const entries: Entry[] = [
      { url: base, changeFrequency: 'weekly', priority: 1 },
      { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.7 },
      { url: `${base}/enquire`, changeFrequency: 'monthly', priority: 0.8 },
    ];

    const brandPackages = packages.filter((p) => p.brand === brand.key);
    if (brandPackages.length) {
      entries.push({ url: `${base}/journeys`, changeFrequency: 'daily', priority: 0.9 });
      entries.push(
        ...brandPackages.map(
          (p): Entry => ({ url: `${base}/journeys/${p.slug}`, changeFrequency: 'weekly', priority: 0.8 }),
        ),
      );
    }

    // Staycations is a hotel directory rather than a journey catalogue.
    if (brand.slug === 'staycations') {
      const hotels = await getStaycationHotels();
      entries.push({ url: `${base}/hotels`, changeFrequency: 'weekly', priority: 0.9 });
      entries.push(
        ...hotels.map(
          (h): Entry => ({ url: `${base}/hotels/${hotelSlug(h.name)}`, changeFrequency: 'weekly', priority: 0.8 }),
        ),
      );
    }

    if (brand.slug === 'holidays') {
      entries.push({ url: `${base}/destinations`, changeFrequency: 'weekly', priority: 0.8 });
      entries.push({ url: `${base}/inspiration`, changeFrequency: 'monthly', priority: 0.7 });
      entries.push(
        ...destinations.map(
          (d): Entry => ({ url: `${base}/destinations/${d.slug}`, changeFrequency: 'weekly', priority: 0.7 }),
        ),
      );
    }

    return entries;
  }

  // The master site.
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/brands`, changeFrequency: 'monthly', priority: 0.9 },
    ...BRANDS.filter((b) => !b.externalUrl).map(
      (b): Entry => ({ url: `${base}/brands/${b.slug}`, changeFrequency: 'weekly', priority: 0.9 }),
    ),
    { url: `${base}/journeys`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/ai-inspiration`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/inspiration`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/destinations`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/plan`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    ...packages.map(
      (p): Entry => ({ url: `${base}/journeys/${p.slug}`, changeFrequency: 'weekly', priority: 0.8 }),
    ),
    ...destinations.map(
      (d): Entry => ({ url: `${base}/destinations/${d.slug}`, changeFrequency: 'weekly', priority: 0.7 }),
    ),
  ];
}
