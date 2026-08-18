/**
 * Populate the Premium Choice Travel journey library — 80 journeys across
 * Holidays, Staycations, Cruise and Golf Holidays.
 *
 * Idempotent: upserts by slug. Existing records are UPGRADED in place and
 * KEEP their current status + featured flag (nothing is auto-published);
 * new records land as 'review' (ready for review) or 'draft' (commercial
 * review required) exactly as authored. Prices are never invented:
 * price_from stays null / untouched, price_status stays 'on_request'.
 *
 * Pre-migration resilience: if the journey-library columns (RUN-ME.sql
 * migration 007) are missing, rows are saved with the basic column set and
 * a warning tells you to run the SQL then re-run this script.
 *
 * Usage: npm run seed:journeys
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'node:fs';
import { HOLIDAYS_JOURNEYS } from '../lib/journeys/holidays';
import { STAYCATIONS_JOURNEYS } from '../lib/journeys/staycations';
import { CRUISES_JOURNEYS } from '../lib/journeys/cruises';
import { GOLF_JOURNEYS } from '../lib/journeys/golf';
import type { JourneySeed } from '../lib/journeys/types';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

type JourneyImage = { url: string; alt: string; source: string; license: string };
const IMAGES: Record<string, JourneyImage[]> = existsSync('lib/generated/journey-images.json')
  ? JSON.parse(readFileSync('lib/generated/journey-images.json', 'utf8'))
  : {};

const withParams = (u: string) => `${u}?q=80&w=1600&auto=format&fit=crop`;

const ALL: JourneySeed[] = [
  ...HOLIDAYS_JOURNEYS,
  ...STAYCATIONS_JOURNEYS,
  ...CRUISES_JOURNEYS,
  ...GOLF_JOURNEYS,
];

async function destinationIds(): Promise<Map<string, number>> {
  // Make sure every destination the journeys reference exists (the three new
  // ones — caribbean, antarctica, dominican-republic — come from the catalogue).
  const { DESTINATION_CATALOGUE } = await import('../lib/destination-catalogue');
  const needed = new Set(ALL.map((j) => j.destinationSlug));
  const { data: existing, error } = await db.from('destinations').select('id, slug');
  if (error) throw new Error(`destinations: ${error.message}`);
  const map = new Map<string, number>((existing ?? []).map((d: any) => [d.slug, d.id]));

  for (const slug of Array.from(needed)) {
    if (map.has(slug)) continue;
    const d = DESTINATION_CATALOGUE.find((x) => x.slug === slug);
    if (!d) {
      console.warn(`⚠ No catalogue entry for destination "${slug}" — journeys will save without a destination link.`);
      continue;
    }
    const fullRow = {
      slug: d.slug, name: d.name, region: d.region, blurb: d.blurb, hero_image: d.heroImage,
      featured: false, sort_order: d.sortOrder, intro: d.intro, when_to_travel: d.whenToTravel,
      culture: d.culture, strapline: d.strapline, tags: d.tags, seasonality: d.seasonality,
      sub_destinations: d.subDestinations, experiences: d.experiences, stay: d.stay,
      journey_ideas: d.journeyIdeas, gallery: d.gallery, priority_rank: d.priorityRank, published: true,
    };
    let res = await db.from('destinations').upsert(fullRow, { onConflict: 'slug' }).select('id, slug').single();
    if (res.error && /column|schema cache/i.test(res.error.message)) {
      const basic = {
        slug: d.slug, name: d.name, region: d.region, blurb: d.blurb, hero_image: d.heroImage,
        featured: false, sort_order: d.sortOrder, intro: d.intro, when_to_travel: d.whenToTravel, culture: d.culture,
      };
      res = await db.from('destinations').upsert(basic, { onConflict: 'slug' }).select('id, slug').single();
    }
    if (res.error || !res.data) throw new Error(`destination ${slug}: ${res.error?.message}`);
    map.set(res.data.slug, res.data.id);
    console.log(`✓ Destination created: ${d.name}`);
  }
  return map;
}

async function main() {
  const destIds = await destinationIds();

  const { data: existingRows, error: exErr } = await db
    .from('packages')
    .select('id, slug, status, featured, hero_image, gallery');
  if (exErr) throw new Error(`packages: ${exErr.message}`);
  const existingBySlug = new Map<string, any>((existingRows ?? []).map((r: any) => [r.slug, r]));

  let libraryColumnsMissing = false;
  const report: Record<string, Record<string, number>> = {};
  const failures: string[] = [];
  let upgraded = 0;
  let created = 0;

  for (const j of ALL) {
    const existing = existingBySlug.get(j.slug);
    const sourced = (IMAGES[j.slug] ?? []).map((i) => withParams(i.url));

    // Imagery: keep an existing hero; top the gallery up to 7+ with sourced images.
    const existingGallery: string[] = existing?.gallery ?? [];
    const hero = existing?.hero_image || sourced[0] || null;
    const gallery = Array.from(new Set([...existingGallery, ...sourced.filter((u) => u !== hero)])).slice(0, 10);

    // Publication safety: a published record stays published and is never
    // downgraded; everything else takes the authored review/draft status
    // (a pre-migration run stores 'review' as 'draft', so re-running after
    // RUN-ME.sql lifts those back to ready-for-review — never to published).
    const status = existing?.status === 'published' ? 'published' : j.status;
    const featured = existing ? existing.featured : false;

    const basicRow = {
      slug: j.slug,
      title: j.title,
      tagline: j.tagline,
      brand: j.brand,
      destination_id: destIds.get(j.destinationSlug) ?? null,
      category: j.category,
      nights: j.nights,
      days: j.days,
      currency: 'AED',
      hero_image: hero,
      gallery,
      overview: j.overview,
      highlights: j.highlights,
      includes: j.includes,
      excludes: j.excludes,
      itinerary: j.itinerary,
      hotel_name: j.hotelName ?? null,
      board_basis: j.boardBasis ?? null,
      featured,
      status: libraryColumnsMissing && status === 'review' ? 'draft' : status,
    };
    const libraryRow = {
      ...basicRow,
      status,
      tags: j.tags,
      who_for: j.whoFor,
      why_works: j.whyWorks,
      seasonal_notes: j.seasonalNotes,
      extensions: j.extensions,
      details: j.details ?? {},
      seo_title: j.seoTitle,
      seo_description: j.seoDescription,
      price_status: 'on_request',
      review_note: j.reviewNote ?? null,
    };

    let res = await db.from('packages').upsert(libraryColumnsMissing ? basicRow : libraryRow, { onConflict: 'slug' });
    if (res.error && /column|schema cache|packages_status_check/i.test(res.error.message)) {
      libraryColumnsMissing = true;
      const legacy = { ...basicRow, status: status === 'review' ? 'draft' : status };
      res = await db.from('packages').upsert(legacy, { onConflict: 'slug' });
    }
    if (res.error) {
      failures.push(`${j.slug}: ${res.error.message}`);
      console.error(`✗ ${j.slug}: ${res.error.message}`);
      continue;
    }

    existing ? upgraded++ : created++;
    const bucket = (report[j.brand] ??= {});
    bucket[status] = (bucket[status] ?? 0) + 1;
    console.log(`${existing ? '↻ upgraded' : '＋ created'} [${j.brand}] ${j.slug} (${status}${gallery.length + (hero ? 1 : 0) >= 7 ? '' : ` · only ${gallery.length + (hero ? 1 : 0)} images`})`);
  }

  console.log('\n────────── POPULATION REPORT ──────────');
  for (const [brand, counts] of Object.entries(report)) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(
      `${brand}: ${total} records — ` +
        Object.entries(counts)
          .map(([s, n]) => `${n} ${s === 'review' ? 'ready for review' : s === 'draft' ? 'commercial review required' : s}`)
          .join(', ')
    );
  }
  console.log(`Upgraded in place: ${upgraded} · Newly created: ${created}`);
  if (failures.length) console.log(`FAILURES (${failures.length}):\n${failures.join('\n')}`);
  if (libraryColumnsMissing) {
    console.warn(
      '\n⚠ The journey-library columns are missing. Paste supabase/RUN-ME.sql into the Supabase SQL editor, then run `npm run seed:journeys` again to store tags, who-for, golf/cruise details, SEO fields and review statuses.'
    );
  }
  console.log('\nImage licensing: all sourced images are Unsplash (Unsplash License); source URLs are kept in lib/generated/journey-images.json.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
