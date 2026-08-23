'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';
import { draftCountryContent, draftCityContent } from '@/lib/destinations/content';

/**
 * Writing a destination page — country or city — from the admin.
 *
 * This existed only as a script, which is why a country added through the
 * admin never got the treatment: South Korea sat with no intro and no
 * education notes until someone remembered to run it by hand. The prompts
 * themselves live in lib/destinations/content.ts so the bulk script and this
 * button cannot drift apart.
 */

export type CountryPageResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED = { ok: false, error: 'School Trips database is not configured.' } as const;

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
    content = await draftCountryContent({
      name: country.name,
      capital: country.capital ?? null,
      avgTempC: country.avg_temp_c ?? null,
      subjects,
    });
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

  let content: any;
  try {
    content = await draftCityContent({
      name: city.name,
      country: (city.countries as any)?.name ?? null,
      subjects,
    });
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
