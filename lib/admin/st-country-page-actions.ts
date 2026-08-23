'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';

/**
 * The editorial content behind a destination page — country or city.
 *
 * This existed only as a script, which is why a country added through the
 * admin never got the treatment: South Korea sat with no intro and no
 * education notes until someone remembered to run it by hand. It is now an
 * admin action, so a new destination is one click from complete.
 *
 * Content is drafted against the subjects the destination actually carries,
 * and the climate summary is grounded in the measured average temperature
 * rather than invented. Photography is no longer part of this: images are
 * uploaded on the destination itself, so what the admin shows is what the
 * public page shows.
 */

export type CountryPageResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED = { ok: false, error: 'School Trips database is not configured.' } as const;

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
} as const;

const curriculumSchema = (place: string) =>
  ({
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
  }) as const;

const phrasesSchema = {
  type: 'array',
  description: 'Four short phrases students would enjoy using. Empty array where English is the working language.',
  items: {
    type: 'object',
    properties: { phrase: { type: 'string' }, meaning: { type: 'string' } },
    required: ['phrase', 'meaning'],
    additionalProperties: false,
  },
} as const;

const COUNTRY_SCHEMA = {
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
} as const;

const CITY_SCHEMA = {
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
} as const;

const SYSTEM = `You write destination pages for a premium school-travel company based in Dubai, read by teachers planning a trip and by the parents they must reassure.

Be specific and factual. Name real museums, sites, landforms and institutions rather than writing in generalities. Never invent statistics, prices or dates. Keep the tone warm but professional — this is a company that schools trust with their students, not a holiday brochure.

Write British English. Do not use exclamation marks. Do not describe a place as "vibrant", "bustling", "a feast for the senses" or similar travel-brochure filler.`;

async function draft(schema: Record<string, unknown>, prompt: string) {
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await claude.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Claude returned no content.');
  return JSON.parse(block.text);
}

function failure(e: any): CountryPageResult {
  if (e instanceof Anthropic.AuthenticationError) {
    return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
  }
  return { ok: false, error: `Content generation failed: ${e.message}` };
}

/** Write the editorial content for one country. */
export async function generateStCountryPage(countryId: number): Promise<CountryPageResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY is not configured.' };

  const db = pcstClient();
  const { data: country } = await db
    .from('countries')
    .select('id, name, slug, capital, avg_temp_c, trips(status, subjects(name))')
    .eq('id', countryId)
    .maybeSingle();
  if (!country) return { ok: false, error: 'Country not found.' };

  const subjects = Array.from(
    new Set(
      ((country.trips as any[]) ?? [])
        .filter((t) => t.status === 'published')
        .map((t) => t.subjects?.name)
        .filter(Boolean)
    )
  ) as string[];

  let content: any;
  try {
    content = await draft(
      COUNTRY_SCHEMA,
      `Country: ${country.name}\n` +
        `Capital: ${country.capital ?? '(unknown)'}\n` +
        `Measured average annual temperature in the capital: ${country.avg_temp_c !== null && country.avg_temp_c !== undefined ? country.avg_temp_c + '°C' : '(unknown)'}\n` +
        `School trips we run here cover these subjects: ${subjects.join(', ') || '(none yet)'}\n` +
        `Trips depart from Dubai.`
    );
  } catch (e: any) {
    return failure(e);
  }

  const { error } = await db
    .from('countries')
    .update({
      intro: content.intro,
      education_notes: content.education_notes,
      curriculum_links: content.curriculum_links,
      climate_summary: content.climate_summary,
      seasons: content.seasons,
      safety_notes: content.safety_notes,
      getting_there: content.getting_there,
      useful_phrases: content.useful_phrases,
      content_updated_at: new Date().toISOString(),
    })
    .eq('id', country.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/school-trips/countries');
  await revalidatePcst(null, 'taxonomy');
  return { ok: true };
}

/** Write the editorial content for one city, in the same shape as a country. */
export async function generateStCityPage(cityId: number): Promise<CountryPageResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY is not configured.' };

  const db = pcstClient();
  const { data: city } = await db
    .from('cities')
    .select('id, name, slug, countries(name)')
    .eq('id', cityId)
    .maybeSingle();
  if (!city) return { ok: false, error: 'City not found.' };

  // Which subjects actually travel to this city, so the curriculum links
  // describe trips that exist rather than trips we might one day run.
  const { data: trips } = await db
    .from('trips')
    .select('city, status, subjects(name)')
    .eq('status', 'published');
  const subjects = Array.from(
    new Set(
      (trips ?? [])
        .filter((t: any) => (t.city ?? '').trim().toLowerCase() === city.name.toLowerCase())
        .map((t: any) => t.subjects?.name)
        .filter(Boolean)
    )
  ) as string[];

  const countryName = (city.countries as any)?.name ?? null;

  let content: any;
  try {
    content = await draft(
      CITY_SCHEMA,
      `City: ${city.name}${countryName ? `, ${countryName}` : ''}\n` +
        `School trips we run here cover these subjects: ${subjects.join(', ') || '(none yet)'}\n` +
        `Trips depart from Dubai.\n\n` +
        `Write about this city specifically — its own museums, districts, transport and character — ` +
        `not about ${countryName ?? 'the country'} in general.`
    );
  } catch (e: any) {
    return failure(e);
  }

  const { error } = await db
    .from('cities')
    .update({
      intro: content.intro,
      education_notes: content.education_notes,
      curriculum_links: content.curriculum_links,
      climate_summary: content.climate_summary,
      seasons: content.seasons,
      getting_around: content.getting_around,
      useful_phrases: content.useful_phrases,
      content_updated_at: new Date().toISOString(),
    })
    .eq('id', city.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/school-trips/cities');
  await revalidatePcst(null, 'taxonomy');
  return { ok: true };
}
