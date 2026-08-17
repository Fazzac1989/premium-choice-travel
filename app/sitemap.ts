import type { MetadataRoute } from 'next';
import { getDestinations, getPublishedPackages } from '@/lib/data';
import { BRANDS } from '@/lib/brands';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const [packages, destinations] = await Promise.all([getPublishedPackages(), getDestinations()]);

  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/brands`, changeFrequency: 'monthly', priority: 0.9 },
    ...BRANDS.filter((b) => !b.externalUrl).map((b) => ({
      url: `${base}/brands/${b.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    { url: `${base}/packages`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/destinations`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/plan`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    ...packages.map((p) => ({
      url: `${base}/packages/${p.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...destinations.map((d) => ({
      url: `${base}/destinations/${d.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
