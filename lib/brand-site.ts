import 'server-only';
import { headers } from 'next/headers';
import type { Brand } from '@/lib/brands';

/**
 * Link prefix for a brand site page. On the brand's own domain the middleware
 * rewrite makes root-relative links work (''); on the master domain the site
 * is previewed under /sites/<slug>.
 */
export function brandBase(brand: Brand): string {
  const host = headers().get('host')?.toLowerCase().split(':')[0].replace(/^www\./, '') ?? '';
  return brand.domains.includes(host) ? '' : `/sites/${brand.slug}`;
}
