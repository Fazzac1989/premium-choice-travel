'use server';

import { emailShell, sendEmail } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';
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

/* ────────────────────────── the running order ────────────────────────── */

/** Merge into the design rather than replace it, so one toggle cannot wipe the rest. */
export async function updateStBrochureDesign(
  id: number,
  patch: Record<string, unknown>,
): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();
  const { data: row } = await db.from('brochures').select('design').eq('id', id).maybeSingle();
  if (!row) return { ok: false, error: 'Brochure not found.' };
  const { error } = await db
    .from('brochures')
    .update({ design: { ...(row.design ?? {}), ...patch }, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh(id);
  await revalidatePcst(null);
  return { ok: true, id };
}

/**
 * Move a trip up or down the brochure, every one of its rows together.
 *
 * The deck orders trips by where their first row appears, and a trip is
 * several rows of copy. Moving one row at a time could leave a trip's
 * highlights above another trip's introduction; moving the block cannot.
 * Rows before the first trip (the cover and front matter) and after the last
 * (the closing) keep their places; dividers between trips are dropped to the
 * front of the run, since the deck draws its own groupings from the trips.
 */
export async function moveStBrochureTrip(
  brochureId: number,
  tripId: number,
  direction: -1 | 1,
): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();
  const { data: rows } = await db
    .from('brochure_pages')
    .select('id, trip_id, sort_order')
    .eq('brochure_id', brochureId)
    .order('sort_order');
  const pages = rows ?? [];

  const order: number[] = [];
  for (const r of pages) if (r.trip_id && !order.includes(r.trip_id)) order.push(r.trip_id);
  const at = order.indexOf(tripId);
  const to = at + direction;
  if (at < 0) return { ok: false, error: 'That trip is not in this brochure.' };
  if (to < 0 || to >= order.length) return { ok: true, id: brochureId };
  [order[at], order[to]] = [order[to], order[at]];

  const firstTrip = pages.findIndex((r) => r.trip_id);
  const lastTrip = pages.length - 1 - [...pages].reverse().findIndex((r) => r.trip_id);
  const front = pages.slice(0, firstTrip);
  const back = pages.slice(lastTrip + 1);
  const middle = pages.slice(firstTrip, lastTrip + 1);
  const loose = middle.filter((r) => !r.trip_id);
  const blocks = order.flatMap((id) => middle.filter((r) => r.trip_id === id));
  const next = [...front, ...loose, ...blocks, ...back];

  for (let i = 0; i < next.length; i++) {
    if (next[i].sort_order !== i) await db.from('brochure_pages').update({ sort_order: i }).eq('id', next[i].id);
  }
  await db.from('brochures').update({ updated_at: new Date().toISOString() }).eq('id', brochureId);
  refresh(brochureId);
  await revalidatePcst(null);
  return { ok: true, id: brochureId };
}

/** Take a trip out of the brochure, or put it back, without losing its copy. */
export async function setStBrochureTripHidden(
  brochureId: number,
  tripId: number,
  hidden: boolean,
): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();
  const { error } = await db
    .from('brochure_pages')
    .update({ hidden })
    .eq('brochure_id', brochureId)
    .eq('trip_id', tripId);
  if (error) return { ok: false, error: error.message };
  await db.from('brochures').update({ updated_at: new Date().toISOString() }).eq('id', brochureId);
  refresh(brochureId);
  await revalidatePcst(null);
  return { ok: true, id: brochureId };
}

/* ──────────────────────────── teacher invites ──────────────────────────── */

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A personal link for one teacher: their page at /b/<token> on the School
 * Trips site, with their name, their school's logo, a message and a button
 * into the brochure. The token also opens a password-protected brochure.
 */
export async function createStBrochureInvite(
  brochureId: number,
  input: { teacherName: string; schoolName: string; email: string; message: string; logoImageId: number | null },
): Promise<BrochureResult & { url?: string }> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const teacherName = input.teacherName.trim();
  if (!teacherName) return { ok: false, error: "Give the teacher's name." };
  const email = input.email.trim();
  if (email && !email.includes('@')) return { ok: false, error: 'That email address does not look right.' };

  const db = pcstClient();
  const token = randomBytes(24).toString('hex');
  const { error } = await db.from('brochure_invites').insert({
    brochure_id: brochureId,
    token,
    teacher_name: teacherName,
    school_name: input.schoolName.trim(),
    email: email || null,
    message: input.message.trim(),
    logo_image_id: input.logoImageId,
  });
  if (error) {
    if (/brochure_invites/.test(error.message)) {
      return { ok: false, error: 'Run the invites migration first (supabase/migrations/20260903010000_brochure_invites.sql).' };
    }
    return { ok: false, error: error.message };
  }
  refresh(brochureId);
  return { ok: true, id: brochureId, url: `${PCST_SITE_URL}/b/${token}` };
}

export async function deleteStBrochureInvite(inviteId: number): Promise<BrochureResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();
  const { data: row } = await db.from('brochure_invites').select('brochure_id').eq('id', inviteId).maybeSingle();
  if (!row) return { ok: false, error: 'Link not found.' };
  const { error } = await db.from('brochure_invites').delete().eq('id', inviteId);
  if (error) return { ok: false, error: error.message };
  refresh(row.brochure_id);
  return { ok: true, id: row.brochure_id };
}

/** Email the teacher their link, with the message as the body. */
export async function sendStBrochureInvite(inviteId: number): Promise<BrochureResult & { skipped?: boolean }> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();
  const { data: inv } = await db.from('brochure_invites').select('*, brochures(title, subtitle)').eq('id', inviteId).maybeSingle();
  if (!inv) return { ok: false, error: 'Link not found.' };
  if (!inv.email) return { ok: false, error: 'This link has no email address.' };

  const brand = emailBrand('schooltrips');
  const url = `${PCST_SITE_URL}/b/${inv.token}`;
  const title = inv.brochures?.title ?? 'Our brochure';
  const first = String(inv.teacher_name).trim().split(/\s+/)[0] || 'there';
  const message = String(inv.message ?? '').trim();
  const paragraphs = (message ? message.split(/\n\s*\n/) : [
    'We have put together a selection of trips we think would suit your students. Have a look through, and we would be glad to talk any of them over.',
  ])
    .map((para) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#425964">${esc(para.trim()).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const html = emailShell({
    brand,
    eyebrow: 'A brochure for you',
    title: `Hello ${esc(first)},`,
    bodyHtml: `
      ${paragraphs}
      <p style="margin:22px 0 0">
        <a href="${url}" style="display:inline-block;background:#19BAAB;color:#fff;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:999px">Open ${esc(title)}</a>
      </p>
      <p style="margin:18px 0 0;font-size:13px;color:#7a8a93">Or copy this link: <a href="${url}" style="color:#19BAAB">${url}</a></p>
    `,
  });

  const sent = await sendEmail({ to: inv.email, subject: `${title} — a brochure for ${inv.school_name || first}`, html });
  if (!sent.ok) return { ok: false, error: sent.error ?? 'The email could not be sent.' };
  if (sent.skipped) return { ok: true, id: inv.brochure_id, skipped: true };

  await db.from('brochure_invites').update({ sent_at: new Date().toISOString() }).eq('id', inviteId);
  refresh(inv.brochure_id);
  return { ok: true, id: inv.brochure_id };
}
