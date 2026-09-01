'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import { slugify, validateTravelDates } from '@/lib/brochure/proposal-rules';
import {
  EMPTY_CONTENT,
  type ProposalCommercials,
  type ProposalContent,
  type ProposalDay,
  type ProposalFlight,
} from '@/lib/brochure/proposal-schema';

/**
 * Proposal Studio.
 *
 * A proposal is a brochure row with `kind = 'proposal'`: same table, different
 * model. The block-based brochures are built from published trips, while a
 * proposal is written for one school and priced for them, so its itinerary,
 * flights and terms live in their own tables rather than in `brochure_pages`.
 *
 * Everything writes through the service role, the same way the rest of the
 * School Trips admin does.
 */

export type ProposalResult = { ok: true; id?: number } | { ok: false; error: string };

const NOT_CONFIGURED = { ok: false, error: 'School Trips database is not configured.' } as const;

function refresh(id?: number) {
  revalidatePath('/admin/school-trips/proposals');
  if (id) revalidatePath(`/admin/school-trips/proposals/${id}`);
}

async function uniqueSlug(base: string, ignoreId?: number): Promise<string> {
  const db = pcstClient();
  const root = slugify(base) || `proposal-${Date.now()}`;
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? root : `${root}-${n + 1}`;
    let q = db.from('brochures').select('id').eq('slug', candidate);
    if (ignoreId) q = q.neq('id', ignoreId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now()}`;
}

/**
 * A proposal edited after it was sent is still the document the school is
 * reading, so the stored PDF has to be treated as out of date. Clearing the
 * timestamp is enough — the PDF route regenerates whenever `updated_at` is
 * newer than `pdf_generated_at`.
 */
async function touch(id: number) {
  const db = pcstClient();
  await db.from('brochures').update({ updated_at: new Date().toISOString() }).eq('id', id);
}

/* ────────────────────────────── creating ────────────────────────────── */

export async function createStProposal(input: {
  title: string;
  preparedFor: string;
  copyFromId?: number | null;
}): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Give the proposal a title.' };

  const slug = await uniqueSlug(title);

  // Copying starts from a finished proposal rather than a blank page, which is
  // how most proposals actually get written.
  let content: ProposalContent = { ...EMPTY_CONTENT, title };
  let extras: Record<string, unknown> = {};
  if (input.copyFromId) {
    const { data: src } = await db
      .from('brochures')
      .select('*')
      .eq('id', input.copyFromId)
      .maybeSingle();
    if (src) {
      content = { ...(src.content ?? EMPTY_CONTENT), title };
      extras = {
        currency: src.currency,
        price_basis_note: src.price_basis_note,
        hero_effect: src.hero_effect,
        terms_set_id: src.terms_set_id,
        student_count: src.student_count,
        free_places_teachers: src.free_places_teachers,
        free_places_pct_staff: src.free_places_pct_staff,
      };
    }
  }

  const { data, error } = await db
    .from('brochures')
    .insert({
      slug,
      title,
      kind: 'proposal',
      status: 'draft',
      prepared_for: input.preparedFor.trim() || null,
      content,
      ...extras,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  // Copy the itinerary too, or the new proposal is a shell.
  if (input.copyFromId && data) {
    const copied = await copyItinerary(input.copyFromId, data.id);
    if (!copied.ok) return copied;
  }

  await db.from('proposal_events').insert({ brochure_id: data.id, event: 'created', metadata: {} });

  refresh();
  return { ok: true, id: data.id };
}

/** Days, their timetable rows and the flights — images stay shared. */
async function copyItinerary(fromId: number, toId: number): Promise<ProposalResult> {
  const db = pcstClient();

  const [{ data: days }, { data: flights }] = await Promise.all([
    db.from('brochure_days').select('*').eq('brochure_id', fromId).order('sort_order'),
    db.from('brochure_flights').select('*').eq('brochure_id', fromId).order('sort_order'),
  ]);

  for (const day of days ?? []) {
    const { data: newDay, error } = await db
      .from('brochure_days')
      .insert({
        brochure_id: toId,
        day_number: day.day_number,
        date: day.date,
        title: day.title,
        summary: day.summary,
        overnight: day.overnight,
        image_ids: day.image_ids,
        sort_order: day.sort_order,
      })
      .select('id')
      .single();
    if (error) return { ok: false, error: error.message };

    const { data: items } = await db
      .from('brochure_day_items')
      .select('*')
      .eq('day_id', day.id)
      .order('sort_order');
    if (items?.length) {
      await db.from('brochure_day_items').insert(
        items.map((i) => ({
          day_id: newDay.id,
          time_label: i.time_label,
          text: i.text,
          sort_order: i.sort_order,
        })),
      );
    }
  }

  if (flights?.length) {
    await db.from('brochure_flights').insert(
      flights.map((f) => ({
        brochure_id: toId,
        direction: f.direction,
        flight_number: f.flight_number,
        carrier: f.carrier,
        from_code: f.from_code,
        from_name: f.from_name,
        to_code: f.to_code,
        to_name: f.to_name,
        departs_at: f.departs_at,
        arrives_at: f.arrives_at,
        note: f.note,
        sort_order: f.sort_order,
      })),
    );
  }

  return { ok: true };
}

/* ────────────────────────────── the document ────────────────────────────── */

export async function updateStProposalContent(
  id: number,
  patch: Partial<ProposalContent>,
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const { data: row } = await db.from('brochures').select('content, title').eq('id', id).maybeSingle();
  if (!row) return { ok: false, error: 'Proposal not found.' };

  const content: ProposalContent = { ...EMPTY_CONTENT, ...(row.content ?? {}), ...patch };

  // The row's title is what the admin lists show; keep it with the document's.
  const update: Record<string, unknown> = { content };
  if (patch.title !== undefined) update.title = patch.title.trim() || row.title;

  const { error } = await db.from('brochures').update(update).eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh(id);
  return { ok: true };
}

export async function updateStProposalCommercials(
  id: number,
  c: Partial<ProposalCommercials> & { heroEffect?: boolean; termsSetId?: number | null },
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const update: Record<string, unknown> = {};
  if (c.preparedFor !== undefined) update.prepared_for = c.preparedFor.trim() || null;
  if (c.travelStart !== undefined) update.travel_start = c.travelStart || null;
  if (c.travelEnd !== undefined) update.travel_end = c.travelEnd || null;
  if (c.studentCount !== undefined) update.student_count = c.studentCount;
  if (c.freePlacesTeachers !== undefined) update.free_places_teachers = c.freePlacesTeachers;
  if (c.freePlacesPctStaff !== undefined) update.free_places_pct_staff = c.freePlacesPctStaff;
  if (c.pricePerStudent !== undefined) update.price_per_student = c.pricePerStudent;
  if (c.currency !== undefined) update.currency = c.currency.trim() || 'AED';
  if (c.priceBasisNote !== undefined) update.price_basis_note = c.priceBasisNote;
  if (c.heroEffect !== undefined) update.hero_effect = c.heroEffect;
  if (c.termsSetId !== undefined) update.terms_set_id = c.termsSetId;

  const dateError = validateTravelDates(
    update.travel_start as string | null,
    update.travel_end as string | null,
  );
  if (dateError) return { ok: false, error: dateError };

  const { error } = await db.from('brochures').update(update).eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh(id);
  return { ok: true };
}

/* ────────────────────────────────── days ────────────────────────────────── */

export async function saveStProposalDay(
  brochureId: number,
  day: Partial<ProposalDay> & { id?: number },
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const row = {
    brochure_id: brochureId,
    day_number: day.dayNumber ?? 1,
    date: day.date || null,
    title: (day.title ?? '').trim(),
    summary: day.summary ?? '',
    overnight: day.overnight ?? '',
    image_ids: day.imageIds ?? [],
    sort_order: day.sortOrder ?? day.dayNumber ?? 1,
  };

  if (day.id) {
    const { error } = await db.from('brochure_days').update(row).eq('id', day.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await db.from('brochure_days').insert(row);
    if (error) return { ok: false, error: error.message };
  }

  await touch(brochureId);
  refresh(brochureId);
  return { ok: true };
}

export async function addStProposalDay(brochureId: number): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const { data: last } = await db
    .from('brochure_days')
    .select('day_number, sort_order, date')
    .eq('brochure_id', brochureId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const dayNumber = (last?.day_number ?? 0) + 1;
  // Follow on from the last day's date rather than leaving it blank.
  const date = last?.date
    ? new Date(new Date(`${last.date}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)
    : null;

  const { error } = await db.from('brochure_days').insert({
    brochure_id: brochureId,
    day_number: dayNumber,
    date,
    title: '',
    summary: '',
    overnight: '',
    image_ids: [],
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) return { ok: false, error: error.message };

  await touch(brochureId);
  refresh(brochureId);
  return { ok: true };
}

export async function deleteStProposalDay(
  brochureId: number,
  dayId: number,
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  // Timetable rows go with it; the migration cascades, but be explicit.
  await db.from('brochure_day_items').delete().eq('day_id', dayId);
  const { error } = await db.from('brochure_days').delete().eq('id', dayId);
  if (error) return { ok: false, error: error.message };

  await renumberDays(brochureId);
  await touch(brochureId);
  refresh(brochureId);
  return { ok: true };
}

export async function moveStProposalDay(
  brochureId: number,
  dayId: number,
  direction: -1 | 1,
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const { data: days } = await db
    .from('brochure_days')
    .select('id, sort_order')
    .eq('brochure_id', brochureId)
    .order('sort_order');
  if (!days) return { ok: false, error: 'No days to move.' };

  const i = days.findIndex((d) => d.id === dayId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= days.length) return { ok: true };

  await db.from('brochure_days').update({ sort_order: days[j].sort_order }).eq('id', days[i].id);
  await db.from('brochure_days').update({ sort_order: days[i].sort_order }).eq('id', days[j].id);

  await renumberDays(brochureId);
  await touch(brochureId);
  refresh(brochureId);
  return { ok: true };
}

/** Day numbers are positional, so they are rewritten after any reorder. */
async function renumberDays(brochureId: number) {
  const db = pcstClient();
  const { data: days } = await db
    .from('brochure_days')
    .select('id')
    .eq('brochure_id', brochureId)
    .order('sort_order');
  await Promise.all(
    (days ?? []).map((d, n) =>
      db.from('brochure_days').update({ day_number: n + 1, sort_order: n + 1 }).eq('id', d.id),
    ),
  );
}

/* ──────────────────────────── timetable rows ──────────────────────────── */

export async function saveStProposalDayItems(
  brochureId: number,
  dayId: number,
  items: { id?: number; timeLabel: string; text: string }[],
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  // Replace wholesale: the editor sends the whole timetable, and diffing rows
  // by index is how orders end up attached to the wrong day.
  await db.from('brochure_day_items').delete().eq('day_id', dayId);

  const rows = items
    .filter((i) => i.timeLabel.trim() || i.text.trim())
    .map((i, n) => ({
      day_id: dayId,
      time_label: i.timeLabel.trim(),
      text: i.text.trim(),
      sort_order: n + 1,
    }));

  if (rows.length) {
    const { error } = await db.from('brochure_day_items').insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  await touch(brochureId);
  refresh(brochureId);
  return { ok: true };
}

/* ───────────────────────────────── flights ───────────────────────────────── */

export async function saveStProposalFlights(
  brochureId: number,
  flights: Partial<ProposalFlight>[],
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  await db.from('brochure_flights').delete().eq('brochure_id', brochureId);

  const rows = flights
    .filter((f) => (f.flightNumber ?? '').trim() || (f.fromCode ?? '').trim())
    .map((f, n) => ({
      brochure_id: brochureId,
      direction: f.direction ?? 'outbound',
      flight_number: (f.flightNumber ?? '').trim(),
      carrier: (f.carrier ?? '').trim(),
      from_code: (f.fromCode ?? '').trim().toUpperCase(),
      from_name: (f.fromName ?? '').trim(),
      to_code: (f.toCode ?? '').trim().toUpperCase(),
      to_name: (f.toName ?? '').trim(),
      departs_at: f.departsAt || null,
      arrives_at: f.arrivesAt || null,
      note: f.note ?? '',
      sort_order: n + 1,
    }));

  if (rows.length) {
    const { error } = await db.from('brochure_flights').insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  await touch(brochureId);
  refresh(brochureId);
  return { ok: true };
}

/* ────────────────────────────── the share link ────────────────────────────── */

export async function issueStProposalLink(
  id: number,
  expiresInDays: number | null,
): Promise<ProposalResult & { url?: string }> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  // 24 bytes of randomness: long enough that the link cannot be guessed, which
  // is the only thing standing between a proposal and the open internet.
  const token = randomBytes(24).toString('hex');
  const expires = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
    : null;

  const { data: row } = await db.from('brochures').select('status').eq('id', id).maybeSingle();
  if (!row) return { ok: false, error: 'Proposal not found.' };

  const { error } = await db
    .from('brochures')
    .update({
      share_token: token,
      share_expires_at: expires,
      // A draft is refused by the share route, so issuing a link has to move it
      // on or the link would 404 for the school.
      status: row.status === 'draft' ? 'sent' : row.status,
      sent_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  await db.from('proposal_events').insert({
    brochure_id: id,
    event: 'sent',
    metadata: { expiresInDays },
  });

  refresh(id);
  return { ok: true, url: `${PCST_SITE_URL}/p/${token}` };
}

export async function revokeStProposalLink(id: number): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const { error } = await db
    .from('brochures')
    .update({ share_token: null, share_expires_at: null })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh(id);
  return { ok: true };
}

export async function setStProposalStatus(
  id: number,
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'expired',
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const { error } = await db.from('brochures').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  if (status === 'accepted') {
    await db.from('proposal_events').insert({ brochure_id: id, event: 'accepted', metadata: {} });
  }

  refresh(id);
  return { ok: true };
}

export async function archiveStProposal(id: number): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  // Archive rather than delete: a sent proposal is a record of what a school
  // was quoted, and the events reference it.
  const { error } = await db
    .from('brochures')
    .update({ status: 'archived', share_token: null })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh(id);
  return { ok: true };
}
