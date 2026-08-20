'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';

/**
 * Subjects and countries for School Trips. Both are plain name/slug lists that
 * trips point at, and both drive their own public pages, so every change asks
 * the School Trips site to rebuild its taxonomy routes.
 */

export type StTaxonomyResult = { ok: true; id?: number } | { ok: false; error: string };

export type TaxonomyKind = 'subject' | 'country';

const TABLE: Record<TaxonomyKind, string> = { subject: 'subjects', country: 'countries' };
const FK: Record<TaxonomyKind, string> = { subject: 'subject_id', country: 'country_id' };

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function refresh() {
  revalidatePath('/admin/school-trips/subjects');
  revalidatePath('/admin/school-trips/countries');
}

export async function addStTerm(
  kind: TaxonomyKind,
  name: string,
  region: string | null
): Promise<StTaxonomyResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const clean = name.trim();
  if (!clean) return { ok: false, error: 'A name is required.' };

  const row: Record<string, unknown> = { name: clean, slug: slugify(clean) };
  if (kind === 'country') row.region = region;

  const { data, error } = await pcstClient().from(TABLE[kind]).insert(row).select('id').single();
  if (error) return { ok: false, error: error.message };

  refresh();
  await revalidatePcst(null, 'taxonomy');
  return { ok: true, id: data.id };
}

export async function updateStTerm(
  kind: TaxonomyKind,
  id: number,
  name: string,
  region: string | null,
  description?: string | null
): Promise<StTaxonomyResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const clean = name.trim();
  if (!clean) return { ok: false, error: 'A name is required.' };

  const row: Record<string, unknown> = { name: clean, slug: slugify(clean) };
  if (kind === 'country') row.region = region;
  // The write-up at the top of the subject's public page.
  if (kind === 'subject' && description !== undefined) row.description = description?.trim() || null;

  const { error } = await pcstClient().from(TABLE[kind]).update(row).eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh();
  await revalidatePcst(null, 'taxonomy');
  return { ok: true };
}

export async function deleteStTerm(kind: TaxonomyKind, id: number): Promise<StTaxonomyResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const db = pcstClient();

  // Check here as well as in the browser: a stale page could otherwise orphan
  // every trip pointing at this row.
  const { count } = await db
    .from('trips')
    .select('id', { count: 'exact', head: true })
    .eq(FK[kind], id);
  if (count && count > 0) {
    return {
      ok: false,
      error: `Used by ${count} trip${count === 1 ? '' : 's'} — reassign ${count === 1 ? 'it' : 'them'} first.`,
    };
  }

  const { error } = await db.from(TABLE[kind]).delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh();
  await revalidatePcst(null, 'taxonomy');
  return { ok: true };
}
