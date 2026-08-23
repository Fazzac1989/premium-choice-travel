// Deliberately not marked `server-only`: the bulk-generation script imports
// this directly so the copy it writes is produced by exactly the same prompt
// the admin button uses. Only ever imported from server actions and scripts.
import Anthropic from '@anthropic-ai/sdk';

/**
 * The editorial content behind a destination page — country or city.
 *
 * Written against the subjects the destination actually carries, so the
 * curriculum links describe trips that exist rather than trips we might one
 * day run. Photography is not part of this: images are uploaded on the
 * destination itself.
 */

export const CONTENT_MODEL = 'claude-opus-5';

const seasonsSchema = {
  type: 'array',
  description: 'Exactly four entries: Spring, Summer, Autumn, Winter.',
  items: {
    type: 'object',
    properties: {
      season: { type: 'string' },
      months: { type: 'string', description: 'e.g. "March to May"' },
      note: { type: 'string', description: 'Under 90 characters: what it is like and whether it suits a school trip.' },
    },
    required: ['season', 'months', 'note'],
    additionalProperties: false,
  },
};

const curriculumSchema = (place: string) => ({
  type: 'array',
  description: 'One entry per subject given, in the same order.',
  items: {
    type: 'object',
    properties: {
      subject: { type: 'string' },
      note: { type: 'string', description: `One sentence on what ${place} offers that subject, naming real places.` },
    },
    required: ['subject', 'note'],
    additionalProperties: false,
  },
});

const phrasesSchema = {
  type: 'array',
  description: 'Four short phrases students would enjoy using. Empty array where English is the working language.',
  items: {
    type: 'object',
    properties: { phrase: { type: 'string' }, meaning: { type: 'string' } },
    required: ['phrase', 'meaning'],
    additionalProperties: false,
  },
};

export const COUNTRY_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string', description: 'Two sentences on why a school would bring students here.' },
    education_notes: {
      type: 'string',
      description:
        'Two to three sentences on what makes this country valuable as a classroom: what students can see or do here that they cannot at home.',
    },
    curriculum_links: curriculumSchema('this country'),
    climate_summary: { type: 'string', description: 'Two sentences on the climate as a visiting school group experiences it.' },
    seasons: seasonsSchema,
    safety_notes: {
      type: 'string',
      description:
        'Two sentences a teacher or parent would want: general safety, health and anything to prepare. Factual, reassuring, not alarmist.',
    },
    getting_there: {
      type: 'string',
      description: 'One or two sentences on flying from Dubai: rough flight time, whether it is direct, and time difference.',
    },
    useful_phrases: phrasesSchema,
  },
  required: [
    'intro', 'education_notes', 'curriculum_links', 'climate_summary', 'seasons',
    'safety_notes', 'getting_there', 'useful_phrases',
  ],
  additionalProperties: false,
};

export const CITY_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string', description: 'Two sentences on why a school would bring students to this city specifically.' },
    education_notes: {
      type: 'string',
      description:
        'Two to three sentences on what makes this city valuable as a classroom — the named museums, institutions, districts or landmarks a group would actually visit.',
    },
    curriculum_links: curriculumSchema('this city'),
    climate_summary: { type: 'string', description: 'Two sentences on the city’s climate as a visiting school group experiences it.' },
    seasons: seasonsSchema,
    getting_around: {
      type: 'string',
      description:
        'Two sentences on moving a school group around this city: the metro, tram or bus network by name, how walkable the centre is, and how far the airport is.',
    },
    useful_phrases: phrasesSchema,
  },
  required: [
    'intro', 'education_notes', 'curriculum_links', 'climate_summary', 'seasons',
    'getting_around', 'useful_phrases',
  ],
  additionalProperties: false,
};

export const SYSTEM = `You write destination pages for a premium school-travel company based in Dubai, read by teachers planning a trip and by the parents they must reassure.

Be specific and factual. Name real museums, sites, landforms and institutions rather than writing in generalities. Never invent statistics, prices or dates. Keep the tone warm but professional — this is a company that schools trust with their students, not a holiday brochure.

Write British English. Do not use exclamation marks. Do not describe a place as "vibrant", "bustling", "a feast for the senses" or similar travel-brochure filler.`;

async function draft(schema: Record<string, unknown>, prompt: string) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured.');
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await claude.messages.create({
    model: CONTENT_MODEL,
    max_tokens: 4000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Claude returned no content.');
  return JSON.parse(block.text);
}

export function draftCountryContent(input: {
  name: string;
  capital: string | null;
  avgTempC: number | null;
  subjects: string[];
}) {
  return draft(
    COUNTRY_SCHEMA,
    `Country: ${input.name}\n` +
      `Capital: ${input.capital ?? '(unknown)'}\n` +
      `Measured average annual temperature in the capital: ${input.avgTempC !== null && input.avgTempC !== undefined ? input.avgTempC + '°C' : '(unknown)'}\n` +
      `School trips we run here cover these subjects: ${input.subjects.join(', ') || '(none yet)'}\n` +
      `Trips depart from Dubai.`
  );
}

export function draftCityContent(input: { name: string; country: string | null; subjects: string[] }) {
  return draft(
    CITY_SCHEMA,
    `City: ${input.name}${input.country ? `, ${input.country}` : ''}\n` +
      `School trips we run here cover these subjects: ${input.subjects.join(', ') || '(none yet)'}\n` +
      `Trips depart from Dubai.\n\n` +
      `Write about this city specifically — its own museums, districts, transport and character — ` +
      `not about ${input.country ?? 'the country'} in general.`
  );
}
