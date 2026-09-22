'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  movePackageInOrder,
  packageOrderOf,
  pagesForPackage,
  reorderPages,
  type OrderableRow,
} from '@/lib/package-brochure/plan';
import type { BrochureDesign } from '@/lib/package-brochure/schema';

/**
 * Brochure Studio, for the brands that sell packages.
 *
 * Everything here writes to this project's own database. A brochure holds
 * references and editorial copy only; package facts — prices, courses, tee
 * times — are read at render time, so a published brochure follows the
 * packages as they change rather than freezing a copy of them.
 */

export type Result = { ok: true; id?: number; slug?: string } | { ok: false; error: string };

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function refresh(brand: string, id?: number, slug?: string) {
  revalidatePath(`/admin/brands/${brand}/brochures`);
  if (id) revalidatePath(`/admin/brands/${brand}/brochures/${id}`);
  if (slug) revalidatePath(`/brochures/${slug}`);
}

/** Slugs are public URLs, so a second "Golf Holidays" must not collide. */
async function uniqueSlug(base: string, ignoreId?: number): Promise<string> {
  const db = createAdminClient();
  const root = slugify(base) || `brochure-${Date.now()}`;
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? root : `${root}-${n + 1}`;
    let q = db.from('package_brochures').select('id').eq('slug', candidate);
    if (ignoreId) q = q.neq('id', ignoreId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/** The fields the page plan needs, without loading every column. */
const PLAN_COLUMNS = 'id, title, itinerary, details, why_works, who_for';

type PlanRow = {
  id: number;
  itinerary: unknown;
  details: Record<string, unknown> | null;
  why_works: unknown;
  who_for: unknown;
};

/** Reuses the shared planner so the studio and the seed agree on page shape. */
function pageTypesFor(row: PlanRow) {
  return pagesForPackage({
    id: row.id,
    courses: Array.isArray(row.details?.courses) ? (row.details!.courses as any[]) : [],
    itinerary: Array.isArray(row.itinerary) ? (row.itinerary as any[]) : [],
    whyWorks: Array.isArray(row.why_works) ? (row.why_works as string[]) : [],
    whoFor: Array.isArray(row.who_for) ? (row.who_for as string[]) : [],
  } as any);
}

/** Append one package's run of pages to the end of a brochure. */
async function appendPackagePages(brochureId: number, rows: PlanRow[], startAt: number) {
  const db = createAdminClient();
  const pages: Record<string, unknown>[] = [];
  let sort = startAt;
  for (const row of rows) {
    for (const pageType of pageTypesFor(row)) {
      pages.push({ brochure_id: brochureId, page_type: pageType, package_id: row.id, sort_order: sort++, content: {} });
    }
  }
  if (pages.length) await db.from('package_brochure_pages').insert(pages);
  return pages.length;
}

/**
 * The closing page sits last. Adding packages inserts before it rather than
 * after, so "talk to us" does not end up in the middle of the collection.
 */
async function resortWithClosingLast(brochureId: number) {
  const db = createAdminClient();
  const { data } = await db
    .from('package_brochure_pages')
    .select('id, sort_order, page_type')
    .eq('brochure_id', brochureId)
    .order('sort_order');
  const rows = (data ?? []) as OrderableRow[];
  const ordered = reorderPages(rows, packageOrderOf(rows));
  await writeOrder(ordered);
}

/** Write a settled order back, touching only the rows that actually moved. */
async function writeOrder(ordered: OrderableRow[]) {
  const db = createAdminClient();
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].sort_order !== i) {
      await db.from('package_brochure_pages').update({ sort_order: i }).eq('id', ordered[i].id);
    }
  }
}

async function touch(id: number) {
  await createAdminClient()
    .from('package_brochures')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);
}

/* ─────────────────────────────── create ─────────────────────────────── */

export async function createBrochure(input: {
  brand: string;
  title: string;
  subtitle?: string;
  packageIds: number[];
}): Promise<Result> {
  await requireAdmin();
  const db = createAdminClient();

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Give the brochure a title.' };

  const slug = await uniqueSlug(title);
  const { data: made, error } = await db
    .from('package_brochures')
    .insert({
      slug,
      brand: input.brand,
      title,
      subtitle: input.subtitle?.trim() || null,
      status: 'draft',
      visibility: 'public',
      design: { coverTheme: 'dark', documentTheme: 'light' },
      package_ids: input.packageIds,
    })
    .select('id, slug')
    .single();
  if (error) return { ok: false, error: error.message };

  // Cover and contents, then a run of pages per package, then the closing.
  const pages: Record<string, unknown>[] = [
    { brochure_id: made.id, page_type: 'cover', sort_order: 0, content: {} },
  ];
  if (input.packageIds.length) {
    pages.push({ brochure_id: made.id, page_type: 'contents', sort_order: 1, content: {} });
  }
  await db.from('package_brochure_pages').insert(pages);

  if (input.packageIds.length) {
    const { data: rows } = await db.from('packages').select(PLAN_COLUMNS).in('id', input.packageIds);
    // Keep the order the studio was given, not the order the database returns.
    const byId = new Map((rows ?? []).map((r: any) => [r.id, r]));
    const ordered = input.packageIds.map((id) => byId.get(id)).filter(Boolean) as PlanRow[];
    await appendPackagePages(made.id, ordered, pages.length);
  }

  const { count } = await db
    .from('package_brochure_pages')
    .select('id', { count: 'exact', head: true })
    .eq('brochure_id', made.id);
  await db
    .from('package_brochure_pages')
    .insert({ brochure_id: made.id, page_type: 'contact', sort_order: count ?? 99, content: {} });

  refresh(input.brand, made.id, made.slug);
  return { ok: true, id: made.id, slug: made.slug };
}

/* ─────────────────────────────── edit ─────────────────────────────── */

export async function updateBrochure(
  id: number,
  brand: string,
  fields: {
    title?: string;
    subtitle?: string | null;
    introText?: string | null;
    closingText?: string | null;
    coverImage?: string | null;
    visibility?: 'public' | 'unlisted';
    seoTitle?: string | null;
    seoDescription?: string | null;
  },
): Promise<Result> {
  await requireAdmin();
  const patch: Record<string, unknown> = {};
  if (fields.title !== undefined) patch.title = fields.title.trim();
  if (fields.subtitle !== undefined) patch.subtitle = fields.subtitle?.trim() || null;
  if (fields.introText !== undefined) patch.intro_text = fields.introText?.trim() || null;
  if (fields.closingText !== undefined) patch.closing_text = fields.closingText?.trim() || null;
  if (fields.coverImage !== undefined) patch.cover_image = fields.coverImage || null;
  if (fields.visibility !== undefined) patch.visibility = fields.visibility;
  if (fields.seoTitle !== undefined) patch.seo_title = fields.seoTitle?.trim() || null;
  if (fields.seoDescription !== undefined) patch.seo_description = fields.seoDescription?.trim() || null;
  if (!Object.keys(patch).length) return { ok: true, id };

  patch.updated_at = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from('package_brochures')
    .update(patch)
    .eq('id', id)
    .select('slug')
    .single();
  if (error) return { ok: false, error: error.message };

  refresh(brand, id, data.slug);
  return { ok: true, id, slug: data.slug };
}

/** The cover theme, the document theme, and which pages are included. */
export async function updateBrochureDesign(
  id: number,
  brand: string,
  patch: Partial<BrochureDesign>,
): Promise<Result> {
  await requireAdmin();
  const db = createAdminClient();
  const { data: row } = await db.from('package_brochures').select('design, slug').eq('id', id).single();
  if (!row) return { ok: false, error: 'Brochure not found.' };

  // Merge, so setting the document theme does not clear the cover's.
  const { error } = await db
    .from('package_brochures')
    .update({ design: { ...(row.design ?? {}), ...patch }, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh(brand, id, row.slug);
  return { ok: true, id, slug: row.slug };
}

/* ─────────────────────────────── packages ─────────────────────────────── */

export async function addPackages(id: number, brand: string, packageIds: number[]): Promise<Result> {
  await requireAdmin();
  if (!packageIds.length) return { ok: true, id };
  const db = createAdminClient();

  const { data: brochure } = await db
    .from('package_brochures')
    .select('package_ids, slug')
    .eq('id', id)
    .single();
  if (!brochure) return { ok: false, error: 'Brochure not found.' };

  const already = new Set<number>(brochure.package_ids ?? []);
  const fresh = packageIds.filter((p) => !already.has(p));
  if (!fresh.length) return { ok: true, id };

  const { count } = await db
    .from('package_brochure_pages')
    .select('id', { count: 'exact', head: true })
    .eq('brochure_id', id);

  const { data: rows } = await db.from('packages').select(PLAN_COLUMNS).in('id', fresh);
  const byId = new Map((rows ?? []).map((r: any) => [r.id, r]));
  const ordered = fresh.map((p) => byId.get(p)).filter(Boolean) as PlanRow[];
  await appendPackagePages(id, ordered, count ?? 0);
  await resortWithClosingLast(id);

  await db
    .from('package_brochures')
    .update({
      package_ids: [...(brochure.package_ids ?? []), ...fresh],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  refresh(brand, id, brochure.slug);
  return { ok: true, id, slug: brochure.slug };
}

/** Take a package out, with every page it brought. */
export async function removePackage(id: number, brand: string, packageId: number): Promise<Result> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: brochure } = await db
    .from('package_brochures')
    .select('package_ids, slug')
    .eq('id', id)
    .single();
  if (!brochure) return { ok: false, error: 'Brochure not found.' };

  await db.from('package_brochure_pages').delete().eq('brochure_id', id).eq('package_id', packageId);
  await resortWithClosingLast(id);
  await db
    .from('package_brochures')
    .update({
      package_ids: (brochure.package_ids ?? []).filter((p: number) => p !== packageId),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  refresh(brand, id, brochure.slug);
  return { ok: true, id, slug: brochure.slug };
}

/**
 * Move a package and its whole run of pages, not one sheet at a time.
 *
 * A reader meets a package as an introduction, its courses, its days and its
 * why page in that order; moving one of those alone would break the run.
 */
export async function movePackage(
  id: number,
  brand: string,
  packageId: number,
  direction: -1 | 1,
): Promise<Result> {
  await requireAdmin();
  const db = createAdminClient();

  const { data } = await db
    .from('package_brochure_pages')
    .select('id, sort_order, page_type, package_id')
    .eq('brochure_id', id)
    .order('sort_order');
  const rows = (data ?? []) as OrderableRow[];

  const before = packageOrderOf(rows);
  const order = movePackageInOrder(before, packageId, direction);
  // Already at the end it was being moved towards.
  if (order === before) return { ok: true, id };

  await writeOrder(reorderPages(rows, order));

  const { data: brochure } = await db
    .from('package_brochures')
    .select('slug')
    .eq('id', id)
    .single();
  await db
    .from('package_brochures')
    .update({ package_ids: order, updated_at: new Date().toISOString() })
    .eq('id', id);

  refresh(brand, id, brochure?.slug);
  return { ok: true, id };
}

/** Turn one page off without deleting it. */
export async function setPageHidden(
  pageId: number,
  brochureId: number,
  brand: string,
  hidden: boolean,
): Promise<Result> {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from('package_brochure_pages').update({ hidden }).eq('id', pageId);
  if (error) return { ok: false, error: error.message };
  await touch(brochureId);
  const { data } = await db.from('package_brochures').select('slug').eq('id', brochureId).single();
  refresh(brand, brochureId, data?.slug);
  return { ok: true, id: brochureId };
}

/* ─────────────────────────────── lifecycle ─────────────────────────────── */

export async function publishBrochure(id: number, brand: string, publish: boolean): Promise<Result> {
  await requireAdmin();
  const db = createAdminClient();
  const { data, error } = await db
    .from('package_brochures')
    .update({
      status: publish ? 'published' : 'draft',
      published_at: publish ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('slug')
    .single();
  if (error) return { ok: false, error: error.message };
  refresh(brand, id, data.slug);
  return { ok: true, id, slug: data.slug };
}

export async function duplicateBrochure(id: number, brand: string): Promise<Result> {
  await requireAdmin();
  const db = createAdminClient();

  const { data: source } = await db.from('package_brochures').select('*').eq('id', id).single();
  if (!source) return { ok: false, error: 'Brochure not found.' };

  const { id: _id, created_at, updated_at, published_at, slug, pdf_storage_path, pdf_generated_at, ...rest } =
    source as any;
  const { data: copy, error } = await db
    .from('package_brochures')
    .insert({
      ...rest,
      slug: await uniqueSlug(`${source.title} copy`),
      title: `${source.title} (copy)`,
      status: 'draft',
      published_at: null,
      // The copy has no PDF of its own until it is rendered.
      pdf_storage_path: null,
      pdf_generated_at: null,
    })
    .select('id, slug')
    .single();
  if (error) return { ok: false, error: error.message };

  const { data: pages } = await db
    .from('package_brochure_pages')
    .select('page_type, package_id, sort_order, content, hidden')
    .eq('brochure_id', id)
    .order('sort_order');
  if (pages?.length) {
    await db
      .from('package_brochure_pages')
      .insert(pages.map((p) => ({ ...p, brochure_id: copy.id })));
  }

  refresh(brand, copy.id, copy.slug);
  return { ok: true, id: copy.id, slug: copy.slug };
}

export async function archiveBrochure(id: number, brand: string): Promise<Result> {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from('package_brochures')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh(brand, id);
  return { ok: true, id };
}

/**
 * Delete a brochure outright. Its pages go with it — the foreign key
 * cascades — but the packages it was built from are untouched.
 */
export async function deleteBrochure(id: number, brand: string): Promise<Result> {
  await requireAdmin();
  const { error } = await createAdminClient().from('package_brochures').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh(brand, id);
  return { ok: true };
}
