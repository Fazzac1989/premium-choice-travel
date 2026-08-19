'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';
import { composeTripCopy, flagUntraceable } from '@/lib/brochure/compose';
import { loadTripRecords, planPages, padToSpread, checkTrips, type TripWarning } from '@/lib/brochure/build';
import type { BrochureKind, DetailLevel, PageContent } from '@/lib/brochure/schema';

/**
 * Brochure Studio.
 *
 * Everything here writes to the School Trips database through the service role,
 * the same way trips, photography and the teacher portal already do. Brochures
 * hold references and editorial copy only; trip facts are read at render time.
 */

export type BrochureResult =
  | { ok: true; id?: number; slug?: string; warnings?: TripWarning[]; flags?: string[] }
  | { ok: false; error: string };

const NOT_CONFIGURED = { ok: false, error: 'School Trips database is not configured.' } as const;

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function refresh(id?: number) {
  revalidatePath('/admin/school-trips/brochures');
  if (id) revalidatePath(`/admin/school-trips/brochures/${id}`);
}

/** Slugs are public URLs, so make sure a second "Japan Collection" does not collide. */
async function uniqueSlug(base: string, ignoreId?: number): Promise<string> {
  const db = pcstClient();
  const root = slugify(base) || `brochure-${Date.now()}`;
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? root : `${root}-${n + 1}`;
    let q = db.from('brochures').select('id').eq('slug', candidate);
    if (ignoreId) q = q.neq('id', ignoreId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/* ────────────────────────────── creating ────────────────────────────── */

export type CreateInput = {
  title: string;
  subtitle: string;
  kind: BrochureKind;
  detailLevel: DetailLevel;
  tripIds: number[];
  subjectIds: number[];
  countryIds: number[];
  clientName: string;
  groupBy: 'subject' | 'country' | 'none';
  showSafety: boolean;
  showApp: boolean;
  showItinerary: boolean;
  coverTheme: 'light' | 'dark';
};

/**
 * Create the brochure and lay out its pages. Copy is written separately, so a
 * failed or slow AI call never leaves a half-created brochure behind.
 */
export async function createStBrochure(input: CreateInput): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'A title is required.' };
  if (!input.tripIds.length) return { ok: false, error: 'Choose at least one trip.' };

  const db = pcstClient();
  const trips = await loadTripRecords(input.tripIds);
  if (!trips.length) return { ok: false, error: 'None of those trips could be loaded.' };

  const slug = await uniqueSlug(input.clientName ? `${input.clientName} ${title}` : title);

  const { data: brochure, error } = await db
    .from('brochures')
    .insert({
      slug,
      title,
      subtitle: input.subtitle.trim() || null,
      kind: input.kind,
      detail_level: input.detailLevel,
      client_name: input.clientName.trim() || null,
      trip_ids: input.tripIds,
      subject_ids: input.subjectIds,
      country_ids: input.countryIds,
      cover_image: trips.find((t) => t.heroImage)?.heroImage ?? null,
      design: {
        coverTheme: input.coverTheme,
        showSafety: input.showSafety,
        showApp: input.showApp,
        showItinerary: input.showItinerary,
        showClientLogo: Boolean(input.clientName.trim()),
      },
    })
    .select('id, slug')
    .single();
  if (error) return { ok: false, error: error.message };

  const planned = padToSpread(
    planPages({
      kind: input.kind,
      detailLevel: input.detailLevel,
      trips,
      design: { showSafety: input.showSafety, showApp: input.showApp },
      groupBy: input.groupBy,
    })
  );

  const { error: pageErr } = await db.from('brochure_pages').insert(
    planned.map((p, i) => ({
      brochure_id: brochure.id,
      page_type: p.pageType,
      sort_order: i,
      trip_id: p.tripId ?? null,
      subject_id: p.subjectId ?? null,
      country_id: p.countryId ?? null,
      layout_variant: p.layoutVariant ?? 'a',
      content: p.content ?? {},
      background_image: p.backgroundImage ?? null,
    }))
  );
  if (pageErr) {
    await db.from('brochures').delete().eq('id', brochure.id);
    return { ok: false, error: `Pages could not be created: ${pageErr.message}` };
  }

  refresh(brochure.id);
  return {
    ok: true,
    id: brochure.id,
    slug: brochure.slug,
    warnings: checkTrips(trips, input.detailLevel),
  };
}

/* ────────────────────────────── composing ────────────────────────────── */

/**
 * Write the copy for every trip in the brochure.
 *
 * One call per trip, reusing the result across that trip's pages, so a trip
 * with a hero, an overview and a journey page is composed once rather than
 * three times.
 */
export async function composeStBrochure(brochureId: number): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured.' };
  }

  const db = pcstClient();
  const { data: brochure } = await db
    .from('brochures')
    .select('id, detail_level, trip_ids')
    .eq('id', brochureId)
    .maybeSingle();
  if (!brochure) return { ok: false, error: 'Brochure not found.' };

  const trips = await loadTripRecords((brochure.trip_ids ?? []) as number[]);
  const detail = (brochure.detail_level ?? 'standard') as DetailLevel;

  const flags: string[] = [];
  let composed = 0;
  let failed = 0;

  for (const trip of trips) {
    const result = await composeTripCopy(trip, detail);
    if (!result.ok) {
      failed++;
      flags.push(`${trip.title}: ${result.error}`);
      continue;
    }

    const untraceable = flagUntraceable(result.content, trip);
    for (const f of untraceable) flags.push(`${trip.title}: ${f}`);

    // The same copy, projected onto whichever pages this trip owns.
    const content: PageContent = {
      ...result.content,
      ctaLabel: 'Explore the full itinerary',
      ctaHref: `${PCST_SITE_URL}/trips/${trip.slug}`,
      imageUrls: trip.landscapeImages.slice(0, 4),
    };

    const { error } = await db
      .from('brochure_pages')
      .update({ content, copy_status: 'ai' })
      .eq('brochure_id', brochureId)
      .eq('trip_id', trip.id);
    if (error) {
      failed++;
      flags.push(`${trip.title}: ${error.message}`);
      continue;
    }
    composed++;
  }

  refresh(brochureId);
  if (composed === 0 && failed > 0) {
    return { ok: false, error: flags[0] ?? 'Nothing could be composed.' };
  }
  return { ok: true, id: brochureId, flags };
}

/** Rewrite one trip's copy, for when a spread does not read well. */
export async function recomposeStTrip(brochureId: number, tripId: number): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  const { data: brochure } = await db
    .from('brochures')
    .select('detail_level')
    .eq('id', brochureId)
    .maybeSingle();
  if (!brochure) return { ok: false, error: 'Brochure not found.' };

  const [trip] = await loadTripRecords([tripId]);
  if (!trip) return { ok: false, error: 'Trip not found.' };

  const result = await composeTripCopy(trip, (brochure.detail_level ?? 'standard') as DetailLevel);
  if (!result.ok) return { ok: false, error: result.error };

  const content: PageContent = {
    ...result.content,
    ctaLabel: 'Explore the full itinerary',
    ctaHref: `${PCST_SITE_URL}/trips/${trip.slug}`,
    imageUrls: trip.landscapeImages.slice(0, 4),
  };

  const { error } = await db
    .from('brochure_pages')
    .update({ content, copy_status: 'ai' })
    .eq('brochure_id', brochureId)
    .eq('trip_id', tripId);
  if (error) return { ok: false, error: error.message };

  refresh(brochureId);
  return { ok: true, flags: flagUntraceable(result.content, trip).map((f) => `${trip.title}: ${f}`) };
}

/* ────────────────────────────── editing ────────────────────────────── */

export async function updateStBrochure(
  id: number,
  fields: {
    title?: string;
    subtitle?: string | null;
    slug?: string;
    clientName?: string | null;
    introText?: string | null;
    closingText?: string | null;
    coverImage?: string | null;
    clientLogo?: string | null;
    visibility?: 'public' | 'unlisted';
    publishingMode?: 'live' | 'snapshot';
    seoTitle?: string | null;
    seoDescription?: string | null;
    design?: Record<string, unknown>;
  }
): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const patch: Record<string, unknown> = {};
  if (fields.title !== undefined) patch.title = fields.title.trim();
  if (fields.subtitle !== undefined) patch.subtitle = fields.subtitle?.trim() || null;
  if (fields.slug !== undefined) patch.slug = await uniqueSlug(fields.slug, id);
  if (fields.clientName !== undefined) patch.client_name = fields.clientName?.trim() || null;
  if (fields.introText !== undefined) patch.intro_text = fields.introText?.trim() || null;
  if (fields.closingText !== undefined) patch.closing_text = fields.closingText?.trim() || null;
  if (fields.coverImage !== undefined) patch.cover_image = fields.coverImage || null;
  if (fields.clientLogo !== undefined) patch.client_logo = fields.clientLogo || null;
  if (fields.visibility !== undefined) patch.visibility = fields.visibility;
  if (fields.publishingMode !== undefined) patch.publishing_mode = fields.publishingMode;
  if (fields.seoTitle !== undefined) patch.seo_title = fields.seoTitle?.trim() || null;
  if (fields.seoDescription !== undefined) patch.seo_description = fields.seoDescription?.trim() || null;
  if (fields.design !== undefined) patch.design = fields.design;
  if (!Object.keys(patch).length) return { ok: true, id };

  patch.updated_at = new Date().toISOString();

  const { data, error } = await pcstClient()
    .from('brochures')
    .update(patch)
    .eq('id', id)
    .select('slug')
    .single();
  if (error) return { ok: false, error: error.message };

  refresh(id);
  await revalidatePcst(null);
  return { ok: true, id, slug: data.slug };
}

/** Hand-edit a page's copy, and record that a human has been over it. */
export async function updateStBrochurePage(
  pageId: number,
  fields: { content?: PageContent; layoutVariant?: string; hidden?: boolean; backgroundImage?: string | null; copyStatus?: 'ai' | 'reviewed' | 'approved' }
): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const patch: Record<string, unknown> = {};
  if (fields.content !== undefined) {
    patch.content = fields.content;
    // Editing the words is itself the review.
    patch.copy_status = fields.copyStatus ?? 'reviewed';
  }
  if (fields.layoutVariant !== undefined) patch.layout_variant = fields.layoutVariant;
  if (fields.hidden !== undefined) patch.hidden = fields.hidden;
  if (fields.backgroundImage !== undefined) patch.background_image = fields.backgroundImage;
  if (fields.copyStatus !== undefined) patch.copy_status = fields.copyStatus;
  if (!Object.keys(patch).length) return { ok: true };

  const { data, error } = await pcstClient()
    .from('brochure_pages')
    .update(patch)
    .eq('id', pageId)
    .select('brochure_id')
    .single();
  if (error) return { ok: false, error: error.message };

  refresh(data.brochure_id);
  return { ok: true, id: data.brochure_id };
}

/** Move a page up or down the running order. */
export async function moveStBrochurePage(pageId: number, direction: -1 | 1): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  const { data: page } = await db
    .from('brochure_pages')
    .select('id, brochure_id, sort_order')
    .eq('id', pageId)
    .maybeSingle();
  if (!page) return { ok: false, error: 'Page not found.' };

  const { data: pages } = await db
    .from('brochure_pages')
    .select('id, sort_order')
    .eq('brochure_id', page.brochure_id)
    .order('sort_order');

  const ordered = pages ?? [];
  const index = ordered.findIndex((p) => p.id === pageId);
  const target = index + direction;
  if (target < 0 || target >= ordered.length) return { ok: true };

  // Rewrite the whole order rather than swapping two values, so duplicated or
  // gapped sort_order values heal themselves.
  const reordered = [...ordered];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved);

  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i].sort_order !== i) {
      await db.from('brochure_pages').update({ sort_order: i }).eq('id', reordered[i].id);
    }
  }

  refresh(page.brochure_id);
  return { ok: true, id: page.brochure_id };
}

/* ────────────────────────────── publishing ────────────────────────────── */

export async function publishStBrochure(id: number, publish: boolean): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  const { data: brochure } = await db
    .from('brochures')
    .select('id, slug, publishing_mode')
    .eq('id', id)
    .maybeSingle();
  if (!brochure) return { ok: false, error: 'Brochure not found.' };

  const patch: Record<string, unknown> = {
    status: publish ? 'published' : 'draft',
    published_at: publish ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  // A snapshot freezes what the reader sees at the moment of publishing, so a
  // proposal sent in March still reads the same in September.
  if (publish && brochure.publishing_mode === 'snapshot') {
    const { data: pages } = await db
      .from('brochure_pages')
      .select('*')
      .eq('brochure_id', id)
      .order('sort_order');
    const { data: trips } = await db
      .from('trips')
      .select('id, slug, title, city, duration_days, duration_nights, subjects(name), countries(name)')
      .in('id', (await db.from('brochures').select('trip_ids').eq('id', id).single()).data?.trip_ids ?? []);
    patch.snapshot_data = { pages: pages ?? [], trips: trips ?? [], frozenAt: new Date().toISOString() };
  }

  const { error } = await db.from('brochures').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh(id);
  await revalidatePcst(null);
  return { ok: true, id, slug: brochure.slug };
}

/**
 * Password-protect a bespoke proposal. Only the hash is stored, and it never
 * leaves the server.
 */
export async function setStBrochurePassword(id: number, password: string): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const clean = password.trim();
  const hash = clean
    ? createHash('sha256').update(`${clean}:${process.env.PCST_REVALIDATE_SECRET ?? 'pcst'}`).digest('hex')
    : null;

  const { error } = await pcstClient().from('brochures').update({ password_hash: hash }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh(id);
  return { ok: true, id };
}

export async function duplicateStBrochure(id: number): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  const { data: source } = await db.from('brochures').select('*').eq('id', id).maybeSingle();
  if (!source) return { ok: false, error: 'Brochure not found.' };

  const { id: _id, created_at, updated_at, published_at, slug, title, ...rest } = source as any;
  const { data: copy, error } = await db
    .from('brochures')
    .insert({
      ...rest,
      title: `${title} (copy)`,
      slug: await uniqueSlug(`${title} copy`),
      status: 'draft',
      published_at: null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  const { data: pages } = await db
    .from('brochure_pages')
    .select('*')
    .eq('brochure_id', id)
    .order('sort_order');

  if (pages?.length) {
    await db.from('brochure_pages').insert(
      pages.map((p: any) => {
        const { id: _pid, created_at: _c, brochure_id: _b, ...page } = p;
        return { ...page, brochure_id: copy.id };
      })
    );
  }

  refresh();
  return { ok: true, id: copy.id };
}

export async function archiveStBrochure(id: number): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  // Historical sales brochures are archived, never destroyed, unless an admin
  // deletes one explicitly.
  const { error } = await pcstClient().from('brochures').update({ status: 'archived' }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh(id);
  return { ok: true, id };
}

export async function deleteStBrochure(id: number): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const { error } = await pcstClient().from('brochures').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/** A one-off token so an unpublished brochure can be previewed by link. */
export async function previewToken(): Promise<string> {
  await requireAdmin();
  return randomBytes(16).toString('hex');
}
