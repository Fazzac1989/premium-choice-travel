'use server';

import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { readSource } from '@/lib/admin/import-source';
import { safeDate, sanitiseItemText as sanitise, slugify } from '@/lib/brochure/proposal-rules';
import { SCHEMA, SYSTEM } from '@/lib/brochure/proposal-import-prompt';
import { EMPTY_CONTENT, type ProposalContent } from '@/lib/brochure/proposal-schema';

/**
 * Turn a proposal document into a draft proposal.
 *
 * Most proposals in this business started life as a Word file or a page of
 * HTML someone wrote by hand. This reads one and produces the structured
 * version — days, timetables, flights, inclusions — so the studio has
 * something to edit rather than a blank page.
 *
 * What it will not do is fill in gaps. A proposal carries a price and a set of
 * dates that a school will hold us to, so anything the document does not
 * actually say comes back empty and is flagged, rather than being guessed into
 * something plausible.
 */

export type ImportResult = { ok: true; id: number; warnings: string[] } | { ok: false; error: string };


type Parsed = {
  title: string;
  titleEmphasis?: string;
  eyebrow?: string;
  subtitle?: string;
  preparedFor?: string;
  intro?: string[];
  overviewHeading?: string;
  overviewEmphasis?: string;
  pctParents?: string;
  pctChildren?: string;
  pctTeachers?: string;
  inclusions?: string[];
  exclusions?: string[];
  currency?: string;
  pricePerStudent?: number | null;
  studentCount?: number | null;
  travelStart?: string | null;
  travelEnd?: string | null;
  days: {
    dayNumber: number;
    date?: string | null;
    title: string;
    summary: string;
    overnight?: string;
    items?: { timeLabel: string; text: string }[];
  }[];
  flights?: {
    direction: 'outbound' | 'return';
    flightNumber?: string;
    carrier?: string;
    fromCode?: string;
    fromName?: string;
    toCode?: string;
    toName?: string;
    note?: string;
  }[];
  notes: string[];
};

export async function importStProposal(
  _previous: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: 'The Claude API key is not configured — add ANTHROPIC_API_KEY to the environment.',
    };
  }

  const read = await readSource(formData);
  if ('error' in read) return { ok: false, error: read.error };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let draft: Parsed;
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Here is the proposal document:\n\n---\n${read.text.slice(0, 120_000)}\n---\n\nExtract the proposal.`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'Claude declined to process this document.' };
    }
    if (response.stop_reason === 'max_tokens') {
      return { ok: false, error: 'The document is too long — split it and import each part separately.' };
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return { ok: false, error: 'Claude returned no content — try again.' };
    draft = JSON.parse(text.text) as Parsed;
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Claude is rate limited right now — wait a moment and retry.' };
    }
    return { ok: false, error: `Could not read that document: ${e.message}` };
  }

  const title = (draft.title ?? '').trim();
  if (!title) return { ok: false, error: 'No trip title could be found in that document.' };

  const db = pcstClient();

  const content: ProposalContent = {
    ...EMPTY_CONTENT,
    title,
    titleEmphasis: draft.titleEmphasis ?? '',
    eyebrow: draft.eyebrow ?? '',
    subtitle: draft.subtitle ?? '',
    intro: (draft.intro ?? []).filter(Boolean),
    overviewHeading: draft.overviewHeading ?? '',
    overviewEmphasis: draft.overviewEmphasis ?? '',
    pctParents: draft.pctParents ?? '',
    pctChildren: draft.pctChildren ?? '',
    pctTeachers: draft.pctTeachers ?? '',
    inclusions: (draft.inclusions ?? []).filter(Boolean),
    exclusions: (draft.exclusions ?? []).filter(Boolean),
  };

  const travelStart = safeDate(draft.travelStart);
  const travelEnd = safeDate(draft.travelEnd);

  // A unique slug, the same way the studio makes one.
  const root = slugify(title) || `proposal-${Date.now()}`;
  let slug = root;
  for (let n = 1; n < 50; n++) {
    const { data: clash } = await db.from('brochures').select('id').eq('slug', slug).maybeSingle();
    if (!clash) break;
    slug = `${root}-${n + 1}`;
  }

  const { data: created, error } = await db
    .from('brochures')
    .insert({
      slug,
      title,
      kind: 'proposal',
      // Always a draft. An imported document has not been checked by anyone,
      // and a draft cannot be opened through a share link.
      status: 'draft',
      prepared_for: (draft.preparedFor ?? '').trim() || null,
      content,
      currency: (draft.currency ?? '').trim() || 'AED',
      price_per_student: typeof draft.pricePerStudent === 'number' ? draft.pricePerStudent : null,
      student_count: typeof draft.studentCount === 'number' ? draft.studentCount : null,
      travel_start: travelStart,
      travel_end: travelEnd,
    })
    .select('id')
    .single();

  if (error || !created) return { ok: false, error: error?.message ?? 'Could not create the proposal.' };

  // Days, renumbered by position rather than trusting the document's numbering.
  const days = (draft.days ?? []).filter((d) => (d.title ?? '').trim() || (d.summary ?? '').trim());
  // An indexed loop rather than .entries(): this project targets ES5.
  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const { data: dayRow } = await db
      .from('brochure_days')
      .insert({
        brochure_id: created.id,
        day_number: i + 1,
        date: safeDate(day.date),
        title: (day.title ?? '').trim(),
        summary: (day.summary ?? '').trim(),
        overnight: (day.overnight ?? '').trim(),
        image_ids: [],
        sort_order: i + 1,
      })
      .select('id')
      .single();

    const items = (day.items ?? []).filter(
      (it: { timeLabel: string; text: string }) => (it.timeLabel ?? '').trim() || (it.text ?? '').trim(),
    );
    if (dayRow && items.length) {
      await db.from('brochure_day_items').insert(
        items.map((it: { timeLabel: string; text: string }, n: number) => ({
          day_id: dayRow.id,
          time_label: (it.timeLabel ?? '').trim(),
          text: sanitise(it.text ?? ''),
          sort_order: n + 1,
        })),
      );
    }
  }

  const flights = (draft.flights ?? []).filter(
    (f) => (f.flightNumber ?? '').trim() || (f.fromCode ?? '').trim(),
  );
  if (flights.length) {
    await db.from('brochure_flights').insert(
      flights.map((f, n) => ({
        brochure_id: created.id,
        direction: f.direction === 'return' ? 'return' : 'outbound',
        flight_number: (f.flightNumber ?? '').trim(),
        carrier: (f.carrier ?? '').trim(),
        from_code: (f.fromCode ?? '').trim().toUpperCase(),
        from_name: (f.fromName ?? '').trim(),
        to_code: (f.toCode ?? '').trim().toUpperCase(),
        to_name: (f.toName ?? '').trim(),
        note: (f.note ?? '').trim(),
        sort_order: n + 1,
      })),
    );
  }

  // Anything the document did not say, in the order staff will want to fix it.
  const warnings = [...(draft.notes ?? [])];
  if (!days.length) warnings.push('No day-by-day itinerary was found.');
  if (draft.pricePerStudent == null) warnings.push('No per-student price was found — add one before sending.');
  if (!travelStart || !travelEnd) warnings.push('Travel dates were not both found — add them before sending.');
  if (!flights.length) warnings.push('No flights were found.');
  if (!content.inclusions.length) warnings.push('Nothing was found for what is included.');

  await db.from('proposal_events').insert({
    brochure_id: created.id,
    event: 'created',
    metadata: { imported: true, warnings },
  });

  return { ok: true, id: created.id, warnings };
}
