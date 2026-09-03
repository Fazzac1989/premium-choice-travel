import Anthropic from '@anthropic-ai/sdk';
import type { BrochureHighlight, DetailLevel, PageContent } from './schema';

/**
 * The brochure copy editor.
 *
 * It rewrites what the trip already says into brochure register: shorter,
 * bolder, readable in about ten seconds. It is an editor, not an author — every
 * fact it prints must already exist in the trip data it is given.
 *
 * This is a selling document for real school travel, so an invented workshop,
 * hotel standard or curriculum claim is not a cosmetic error: it is a promise
 * the company never made, printed under its own logo.
 */

export const COMPOSE_MODEL = 'claude-opus-5';

const SYSTEM = `You write brochure copy for Premium Choice School Trips, a company that runs educational travel for schools in the UAE. You are given the data held for one trip and you turn it into short, editorial brochure copy.

YOU CONDENSE. YOU NEVER INVENT.

Every place, activity, museum, journey, meal, subject link and inclusion you print must already appear in the material you are given. If the material does not say which museum, do not name one. If it does not say which airline, hotel, university, restaurant or workshop, do not name one. If it gives no learning focus, return an empty list rather than a plausible one. A brochure is used to sell school trips to head teachers and parents; a detail you invented becomes a promise the company has to keep.

Operators deliberately write vaguely. "A carefully selected engineering experience" means the supplier is not fixed yet. Keep that vague. Turning it into a named factory puts a commitment on a printed page that nobody has made.

PRESERVE CONDITIONS. If the source hedges — subject to availability, subject to travel dates, weather permitting, subject to institutional confirmation, depending on flight times — that hedge travels with the item into the conditions list, in the source's own terms. Never quietly drop it to make the copy read better.

REGISTER. Write British English. Confident, warm, specific, unhurried. Concrete nouns over adjectives. No exclamation marks, no emoji, no marketing throat-clearing ("Embark on the journey of a lifetime"), no second-person hard sell. Say what the students will actually see and do.

Do not repeat the trip title inside the proposition or the intro — the reader can already see it.`;

const CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    headline: {
      type: 'string',
      description:
        'The destination or theme, 1–4 words, as it would be set large on the page. Usually the country or city, e.g. "Japan" or "Iceland".',
    },
    subheadline: {
      type: 'string',
      description:
        'The editorial line under the headline, 2–6 words, drawn from what the trip is actually about, e.g. "Future, Heritage & Hiroshima". Title case.',
    },
    proposition: {
      type: 'string',
      description:
        'ONE sentence, under 120 characters, saying what makes this trip worth taking. No trip title, no superlatives that the source does not support.',
    },
    intro: {
      type: 'string',
      description:
        'Two or three sentences, under 400 characters, condensing the overview. Names the real places visited. Omit entirely (empty string) if the source has no overview.',
    },
    highlights: {
      type: 'array',
      description:
        'The 4–6 most compelling things in this trip, each already present in the source. Fewer is fine. Never pad to reach six.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The place or experience, 1–4 words, e.g. "Miraikan" or "Shinkansen".' },
          note: { type: 'string', description: 'Under 60 characters saying why it matters, e.g. "Robotics, AI & future technology".' },
          conditional: {
            type: 'string',
            description:
              'The source\'s own hedge if this item was conditional, e.g. "subject to availability". Empty string when the source stated it plainly.',
          },
        },
        required: ['name', 'note', 'conditional'],
        additionalProperties: false,
      },
    },
    learningFocus: {
      type: 'array',
      description:
        'Curriculum areas this trip genuinely addresses according to the source. Empty list if the source does not say. Never inferred from the destination alone.',
      items: { type: 'string' },
    },
    keyLocations: {
      type: 'array',
      description: 'Towns and cities visited, in travel order, from the itinerary. Not regions, not countries.',
      items: { type: 'string' },
    },
    conditions: {
      type: 'array',
      description:
        'Every conditional statement in the source, in its own words. These are printed in the brochure so nothing is promised that was hedged.',
      items: { type: 'string' },
    },
  },
  required: ['headline', 'subheadline', 'proposition', 'intro', 'highlights', 'learningFocus', 'keyLocations', 'conditions'],
  additionalProperties: false,
} as const;

export type TripSource = {
  title: string;
  subject: string | null;
  country: string | null;
  city: string | null;
  durationDays: number;
  durationNights: number;
  overview: string[];
  includes: string[];
  tripHighlights: string[];
  journey: { location: string; fromDay: number; toDay: number }[];
  days: {
    dayNumber: number;
    label: string | null;
    title: string;
    description: string;
    displayTitle: string | null;
    summary: string | null;
    primaryLocation: string | null;
    highlights: { name: string; summary: string; conditional: boolean; conditionalText: string }[];
    learningFocus: string[];
    notices: string[];
  }[];
};

/** How much the composer is allowed to say, by detail level. */
const BRIEF: Record<DetailLevel, string> = {
  inspiration:
    'This is an INSPIRATION brochure: the shortest form. Give at most 4 highlights and keep the intro to two sentences. The reader is browsing, not deciding.',
  standard:
    'This is a STANDARD brochure. Give 4–6 highlights, a two or three sentence intro, and the learning focus where the source supports one.',
  detailed:
    'This is a DETAILED brochure. Give 5–6 highlights and a fuller intro, and be thorough with key locations and conditions, because this reader is close to deciding.',
};

/** Everything the model is allowed to know about the trip. */
function sourceBrief(trip: TripSource): string {
  const lines: string[] = [
    `TITLE: ${trip.title}`,
    `SUBJECT: ${trip.subject ?? '(not recorded)'}`,
    `DESTINATION: ${[trip.city, trip.country].filter(Boolean).join(', ') || '(not recorded)'}`,
    `DURATION: ${trip.durationDays} days / ${trip.durationNights} nights`,
  ];

  if (trip.overview.length) lines.push('', 'OVERVIEW:', ...trip.overview);
  if (trip.tripHighlights.length) lines.push('', `EXISTING HIGHLIGHTS: ${trip.tripHighlights.join(' · ')}`);
  if (trip.journey.length) {
    lines.push('', `ROUTE: ${trip.journey.map((j) => `${j.location} (days ${j.fromDay}–${j.toDay})`).join(' → ')}`);
  }

  if (trip.days.length) {
    lines.push('', 'DAY BY DAY:');
    for (const d of trip.days) {
      lines.push(`--- Day ${d.dayNumber}: ${d.displayTitle || d.title}${d.primaryLocation ? ` (${d.primaryLocation})` : ''}`);
      if (d.summary) lines.push(`Summary: ${d.summary}`);
      for (const h of d.highlights) {
        lines.push(`  • ${h.name} — ${h.summary}${h.conditional ? ` [CONDITIONAL: ${h.conditionalText}]` : ''}`);
      }
      if (d.learningFocus.length) lines.push(`  Learning: ${d.learningFocus.join(', ')}`);
      for (const n of d.notices) lines.push(`  [NOTICE: ${n}]`);
      // The original words, so nothing depends on the structured layer alone.
      if (!d.summary) lines.push(d.description);
    }
  }

  if (trip.includes.length) lines.push('', 'INCLUDED:', ...trip.includes.map((i) => `• ${i}`));

  return lines.join('\n');
}

export type ComposeResult =
  | { ok: true; content: PageContent }
  | { ok: false; error: string };

/** Write the brochure copy for one trip. */
export async function composeTripCopy(
  trip: TripSource,
  detailLevel: DetailLevel
): Promise<ComposeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'ANTHROPIC_API_KEY is not configured.' };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: COMPOSE_MODEL,
      max_tokens: 3000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: CONTENT_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${BRIEF[detailLevel]}\n\nHere is everything held for this trip. Use nothing else.\n\n${sourceBrief(trip)}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') return { ok: false, error: 'Claude declined this request.' };
    if (response.stop_reason === 'max_tokens') return { ok: false, error: 'The reply was cut short — try again.' };

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return { ok: false, error: 'Claude returned no content.' };

    const raw = JSON.parse(block.text) as {
      headline: string;
      subheadline: string;
      proposition: string;
      intro: string;
      highlights: { name: string; note: string; conditional: string }[];
      learningFocus: string[];
      keyLocations: string[];
      conditions: string[];
    };

    const highlights: BrochureHighlight[] = (raw.highlights ?? [])
      .filter((h) => h.name?.trim())
      .map((h) => ({
        name: h.name.trim(),
        note: h.note?.trim() ?? '',
        ...(h.conditional?.trim() ? { conditional: h.conditional.trim() } : {}),
      }));

    const content: PageContent = {
      eyebrow: [trip.subject, `${trip.durationDays} days`].filter(Boolean).join(' · '),
      headline: raw.headline?.trim() || trip.country || trip.title,
      subheadline: raw.subheadline?.trim() || '',
      proposition: raw.proposition?.trim() || '',
      intro: raw.intro?.trim() || '',
      highlights,
      learningFocus: (raw.learningFocus ?? []).map((s) => s.trim()).filter(Boolean),
      keyLocations: (raw.keyLocations ?? []).map((s) => s.trim()).filter(Boolean),
      conditions: (raw.conditions ?? []).map((s) => s.trim()).filter(Boolean),
    };

    return { ok: true, content };
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Rate limited by the Claude API — try again shortly.' };
    }
    return { ok: false, error: `Could not compose this trip: ${e.message}` };
  }
}

/**
 * A safety net over the composer.
 *
 * The prompt forbids invention, but a brochure is printed and sent to schools,
 * so the output is checked against the source as well: every highlight name
 * should be traceable to the trip's own words. Anything that is not is
 * surfaced to the admin as a review flag rather than silently published.
 */
export function flagUntraceable(content: PageContent, trip: TripSource): string[] {
  const haystack = [
    trip.title,
    trip.overview.join(' '),
    trip.includes.join(' '),
    trip.tripHighlights.join(' '),
    trip.journey.map((j) => j.location).join(' '),
    trip.days
      .map((d) => [d.title, d.displayTitle, d.summary, d.description, d.primaryLocation, d.highlights.map((h) => `${h.name} ${h.summary}`).join(' ')].join(' '))
      .join(' '),
  ]
    .join(' ')
    .toLowerCase();

  const flags: string[] = [];

  for (const h of content.highlights ?? []) {
    // Compare on the significant words, so "Miraikan Museum" still matches "Miraikan".
    const words = h.name.toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length > 3);
    if (words.length && !words.some((w) => haystack.includes(w))) {
      flags.push(`"${h.name}" does not appear in the trip's own text — check it before publishing.`);
    }
  }

  for (const place of content.keyLocations ?? []) {
    const key = place.toLowerCase().split(/[^a-z0-9']+/).filter((w) => w.length > 3)[0];
    if (key && !haystack.includes(key)) {
      flags.push(`Location "${place}" does not appear in the itinerary.`);
    }
  }

  return flags;
}

/* ───────────────────────── the "Why <country>" page ───────────────────────── */

const WHY_SYSTEM = `${SYSTEM}

THIS PAGE IS DIFFERENT. It is the "Why <country>" page that closes a trip's run of pages, and it is allowed one thing the rest of the brochure is not: widely known, uncontroversial facts about the country itself — its landscape, climate, history, institutions — the kind found in any encyclopaedia. Everything about THIS TRIP — what the group does and sees, where it goes — must still come from the material you are given.

Never state a price. Never state an age group as a fact: the source records none, so "suited to" is your professional recommendation from the physical demands and curriculum level of the activities, phrased as a recommendation. Exactly five educational values, each tied to something the trip actually does.`;

const WHY_SCHEMA = {
  type: 'object',
  properties: {
    whyCountry: {
      type: 'string',
      description:
        'Two or three sentences, under 420 characters: why this country is the right place to teach this subject to a school group. Widely known facts about the country are allowed; nothing about the trip the source does not say.',
    },
    pctView: {
      type: 'string',
      description:
        'Two sentences, under 300 characters, in Premium Choice\'s own voice ("we"): why we recommend this trip, drawn from what the source says it does well. Warm, specific, unhurried.',
    },
    ageGroup: {
      type: 'string',
      description:
        'A recommendation, under 60 characters, e.g. "Years 9–11 (ages 13–16)", judged from the activities\' physical demands and curriculum level. Empty string if the source gives no basis.',
    },
    educationalValues: {
      type: 'array',
      description:
        'Exactly five things a student gains from this trip, each grounded in an activity, place or subject link that the source names.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Three to six words, e.g. "Fieldwork in a live volcanic landscape".' },
          detail: { type: 'string', description: 'One sentence, under 160 characters, naming what in the trip delivers it.' },
        },
        required: ['title', 'detail'],
        additionalProperties: false,
      },
    },
  },
  required: ['whyCountry', 'pctView', 'ageGroup', 'educationalValues'],
  additionalProperties: false,
} as const;

export type WhyCopy = Required<Pick<PageContent, 'whyCountry' | 'pctView' | 'ageGroup' | 'educationalValues'>>;

/** Tidy the model's reply. Never carries a price: that is typed by a person. */
export function normaliseWhy(raw: any): WhyCopy {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const values = Array.isArray(raw?.educationalValues) ? raw.educationalValues : [];
  return {
    whyCountry: str(raw?.whyCountry),
    pctView: str(raw?.pctView),
    ageGroup: str(raw?.ageGroup),
    educationalValues: values
      .map((v: any) => ({ title: str(v?.title), detail: str(v?.detail) }))
      .filter((v: { title: string; detail: string }) => v.title || v.detail)
      .slice(0, 5),
  };
}

export type WhyResult = { ok: true; content: WhyCopy } | { ok: false; error: string };

/** Write the "Why <country>" page for one trip. */
export async function composeWhyCopy(trip: TripSource, detailLevel: DetailLevel): Promise<WhyResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY is not configured.' };
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model: COMPOSE_MODEL,
      max_tokens: 2000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: WHY_SCHEMA } },
      system: WHY_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `${BRIEF[detailLevel]}\n\nWrite the "Why ${trip.country ?? 'this destination'}" page. Here is everything held for this trip.\n\n${sourceBrief(trip)}`,
        },
      ],
    });
    if (response.stop_reason === 'refusal') return { ok: false, error: 'Claude declined this request.' };
    if (response.stop_reason === 'max_tokens') return { ok: false, error: 'The reply was cut short — try again.' };
    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return { ok: false, error: 'Claude returned no content.' };
    return { ok: true, content: normaliseWhy(JSON.parse(block.text)) };
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    if (e instanceof Anthropic.RateLimitError) return { ok: false, error: 'Rate limited by the Claude API — try again shortly.' };
    return { ok: false, error: `Could not write the Why page: ${e.message}` };
  }
}
