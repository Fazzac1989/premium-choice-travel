'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';

/**
 * Photography for destination pages — countries and cities.
 *
 * The images live on the record itself, so what an editor sees here is exactly
 * what the public page renders: remove one and it is gone, with nothing else
 * quietly taking its place.
 */

export type DestinationKind = 'country' | 'city';
export type DestinationResult = { ok: true } | { ok: false; error: string };

const TABLE: Record<DestinationKind, string> = { country: 'countries', city: 'cities' };

export async function saveStDestinationImages(
  kind: DestinationKind,
  id: number,
  heroImage: string,
  heroAlt: string,
  gallery: string[]
): Promise<DestinationResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const clean = gallery.map((g) => (g ?? '').trim()).filter(Boolean);
  const { error } = await pcstClient()
    .from(TABLE[kind])
    .update({
      hero_image: heroImage.trim() || null,
      hero_alt: heroAlt.trim() || null,
      gallery: clean.map((url) => ({ url, alt: heroAlt.trim() || '' })),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/school-trips/${kind === 'city' ? 'cities' : 'countries'}`);
  await revalidatePcst(null, 'taxonomy');
  return { ok: true };
}

/**
 * Refresh the city list from the published catalogue. A city earns a page once
 * a trip is based there and nowhere else — "Tokyo · Kyoto" is a route, not a
 * city — which mirrors the rule the public site uses.
 */
export async function syncStCities(): Promise<DestinationResult & { added?: number }> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const db = pcstClient();
  const { data: trips, error } = await db
    .from('trips')
    .select('city, country_id, status')
    .eq('status', 'published');
  if (error) return { ok: false, error: error.message };

  const isSingleCity = (c: string | null) =>
    Boolean(c) && Boolean(c!.trim()) && !/[,·&/+]| and | to /i.test(c!);
  const slugify = (s: string) =>
    s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const wanted = new Map<string, { name: string; slug: string; country_id: number | null }>();
  for (const t of trips ?? []) {
    if (!isSingleCity(t.city)) continue;
    const name = t.city!.trim();
    const slug = slugify(name);
    if (!wanted.has(slug)) wanted.set(slug, { name, slug, country_id: t.country_id ?? null });
  }

  const { data: existing } = await db.from('cities').select('slug');
  const have = new Set((existing ?? []).map((c: any) => c.slug));
  const toAdd = Array.from(wanted.values()).filter((c) => !have.has(c.slug));

  if (toAdd.length) {
    const { error: insErr } = await db.from('cities').insert(toAdd);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath('/admin/school-trips/cities');
  return { ok: true, added: toAdd.length };
}
