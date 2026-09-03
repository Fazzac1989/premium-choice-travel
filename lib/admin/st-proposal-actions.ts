'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import { slugify, validateTravelDates } from '@/lib/brochure/proposal-rules';
import { emailBrand } from '@/lib/email-brand';
import { emailRows, emailShell, sendEmail } from '@/lib/email';
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

/* ────────────────────────── sending it to a school ────────────────────────── */

/**
 * Email the school its link.
 *
 * The link is issued here rather than reused, so "send" always produces a
 * working address even if the previous one was revoked or has expired. That
 * does invalidate any link already in circulation, which is said plainly in
 * the interface.
 */
export async function sendStProposalEmail(
  id: number,
  input: { to: string; message?: string; expiresInDays?: number | null },
): Promise<ProposalResult & { url?: string; skipped?: boolean }> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const to = input.to.trim();
  if (!to || !to.includes('@')) return { ok: false, error: 'Give a valid email address.' };

  const db = pcstClient();
  const { data: row } = await db
    .from('brochures')
    .select('id, title, prepared_for, price_per_student, currency, travel_start, travel_end, student_count')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { ok: false, error: 'Proposal not found.' };

  const issued = await issueStProposalLink(id, input.expiresInDays ?? null);
  if (!issued.ok || !issued.url) return issued;

  const brand = emailBrand('schooltrips');
  const money =
    row.price_per_student != null
      ? `${row.currency ?? 'AED'} ${Number(row.price_per_student).toLocaleString()}`
      : null;

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#425964">
      ${input.message?.trim()
        ? escapeHtml(input.message.trim()).replace(/\n/g, '<br/>')
        : `Your proposal is ready to read. It covers the itinerary day by day, what is included, the price and our booking conditions.`}
    </p>
    ${emailRows([
      ['Trip', row.title],
      ['Prepared for', row.prepared_for],
      ['Dates', formatDateRange(row.travel_start, row.travel_end)],
      ['Group', row.student_count ? `${row.student_count} students` : null],
      ['Price per student', money],
    ])}
    <p style="margin:20px 0 0;font-size:13px;line-height:1.65;color:#8a969c">
      This link is personal to your school. Please do not share it more widely than you need to.
    </p>`;

  const sent = await sendEmail({
    to,
    subject: `Your proposal — ${row.title}`,
    html: emailShell({
      title: 'Your proposal is ready',
      eyebrow: `Proposal · ${brand.tag}`,
      bodyHtml,
      cta: { label: 'Read the proposal', url: issued.url },
      brand,
    }),
  });

  if (!sent.ok) return { ok: false, error: sent.error ?? 'The email could not be sent.' };

  await db.from('proposal_events').insert({
    brochure_id: id,
    event: 'sent',
    metadata: { to, skipped: Boolean(sent.skipped) },
  });

  refresh(id);
  // `skipped` means there is no mail key configured: the link is real and the
  // proposal is marked sent, but nothing left the building. Saying so is the
  // difference between a working send and a silent one.
  return { ok: true, url: issued.url, skipped: sent.skipped };
}

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const f = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  return end ? `${f(start)} to ${f(end)}` : f(start);
}

/** The message is typed by staff, but it still goes into an HTML email. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Delete a proposal outright.
 *
 * Archiving is the safer habit and stays the default in the editor, but a
 * proposal written by mistake should not have to be kept forever. The days,
 * timetable rows, flights and events all carry `on delete cascade`, so the
 * row taking them with it is the schema working as intended rather than an
 * accident.
 */
export async function deleteStProposal(id: number): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const { data: row } = await db
    .from('brochures')
    .select('id, kind, status')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { ok: false, error: 'Proposal not found.' };
  // Guard the kind: this action is reachable only from the proposal list, and
  // a mistyped id should not be able to take a brochure with it.
  if (row.kind !== 'proposal') return { ok: false, error: 'That is not a proposal.' };

  const { error } = await db.from('brochures').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };

  refresh();
  return { ok: true };
}

/* ────────────────────────────── photographs ────────────────────────────── */

export type ImageResult = { ok: true; id: number } | { ok: false; error: string } | null;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];
// Vercel rejects a request body over 4.5MB before this runs; the browser resizes first.
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_BUCKET = 'brochure-images';
const IMAGES_MIGRATION = 'supabase/migrations/20260903000000_brochure_images_owner.sql';

/**
 * Upload one photograph for one proposal.
 *
 * Called with FormData from the Photos tab, one file at a time. The row records
 * its owner, which is what keeps another proposal's pictures out of the pickers.
 */
export async function uploadStProposalImage(_prev: ImageResult, formData: FormData): Promise<ImageResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const id = Number(formData.get('proposalId'));
  const file = formData.get('file');
  if (!Number.isFinite(id)) return { ok: false, error: 'Which proposal?' };
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'No file received.' };
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, error: 'JPG, PNG, WebP or AVIF only.' };
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: 'Still over 4MB after resizing — save it at a smaller size and try again.' };
  }

  const db = pcstClient();
  const { data: owner } = await db.from('brochures').select('id, kind').eq('id', id).maybeSingle();
  // Proposals and brochures alike: a brochure's teacher invites carry a school logo.
  if (!owner) return { ok: false, error: 'Brochure not found.' };

  const clean = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
  const storagePath = `proposals/${id}/${Date.now()}-${clean || 'photo.jpg'}`;
  const up = await db.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (up.error) return { ok: false, error: `Upload failed: ${up.error.message}` };

  const { data: row, error } = await db
    .from('brochure_images')
    .insert({
      storage_path: storagePath,
      alt: String(formData.get('alt') ?? '').trim(),
      brochure_id: id,
      width: Number(formData.get('width')) || null,
      height: Number(formData.get('height')) || null,
      // "logo" keeps the school's mark out of the photograph pickers.
      tags: formData.get('tag') ? [String(formData.get('tag'))] : [],
    })
    .select('id')
    .single();
  if (error) {
    // Nothing half-done: the file goes if the row could not be written.
    await db.storage.from(IMAGE_BUCKET).remove([storagePath]);
    if (/brochure_id/.test(error.message)) {
      return { ok: false, error: `Run the photographs migration first (${IMAGES_MIGRATION}).` };
    }
    return { ok: false, error: error.message };
  }

  await touch(id);
  refresh(id);
  return { ok: true, id: row.id };
}

export async function updateStProposalImageAlt(
  proposalId: number,
  imageId: number,
  alt: string,
): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();
  const { error } = await db
    .from('brochure_images')
    .update({ alt: alt.trim() })
    .eq('id', imageId)
    .eq('brochure_id', proposalId);
  if (error) return { ok: false, error: error.message };
  await touch(proposalId);
  refresh(proposalId);
  return { ok: true };
}

/**
 * Delete a photograph and every reference to it, so no day or page is left
 * pointing at a picture that is gone. Only a proposal's own photographs can
 * be deleted from its studio.
 */
export async function deleteStProposalImage(proposalId: number, imageId: number): Promise<ProposalResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  const db = pcstClient();

  const { data: image } = await db
    .from('brochure_images')
    .select('id, storage_path, brochure_id')
    .eq('id', imageId)
    .maybeSingle();
  if (!image || image.brochure_id !== proposalId) {
    return { ok: false, error: 'That photograph does not belong to this proposal.' };
  }

  const { data: days } = await db.from('brochure_days').select('id, image_ids').eq('brochure_id', proposalId);
  for (const d of days ?? []) {
    const ids: number[] = Array.isArray(d.image_ids) ? d.image_ids : [];
    if (ids.includes(imageId)) {
      await db.from('brochure_days').update({ image_ids: ids.filter((x) => x !== imageId) }).eq('id', d.id);
    }
  }

  const { data: row } = await db.from('brochures').select('content, cover_image').eq('id', proposalId).maybeSingle();
  if (row) {
    const content: ProposalContent = { ...EMPTY_CONTENT, ...(row.content ?? {}) };
    const strip = (v: number | null) => (v === imageId ? null : v);
    const next: ProposalContent = {
      ...content,
      heroImageId: strip(content.heroImageId),
      schoolLogoImageId: strip(content.schoolLogoImageId),
      signatureExperiences: content.signatureExperiences.map((e) => ({ ...e, imageId: strip(e.imageId) })),
      customPages: content.customPages.map((p) => ({ ...p, imageId: strip(p.imageId) })),
    };
    const update: Record<string, unknown> = { content: next };
    if (String(row.cover_image) === String(imageId)) update.cover_image = null;
    await db.from('brochures').update(update).eq('id', proposalId);
  }

  await db.storage.from(IMAGE_BUCKET).remove([image.storage_path]);
  const { error } = await db.from('brochure_images').delete().eq('id', imageId);
  if (error) return { ok: false, error: error.message };

  await touch(proposalId);
  refresh(proposalId);
  return { ok: true };
}
