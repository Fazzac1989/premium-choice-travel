/**
 * Seed the city pages from the published catalogue and write each one's
 * editorial content.
 *
 *   npx tsx scripts/generate-st-city-content.mjs            → only cities without content
 *   npx tsx scripts/generate-st-city-content.mjs --force     → rewrite every city
 *   npx tsx scripts/generate-st-city-content.mjs london kyoto
 *
 * A city earns a page once a trip is based there and nowhere else, which is
 * the same rule the public site applies — "Tokyo · Kyoto" is a route, not a
 * city. Content comes from lib/destinations/content.ts, the same prompts the
 * admin button uses, so the two cannot drift.
 *
 * Resumable: cities that already have an intro are skipped unless --force.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { draftCityContent } from '../lib/destinations/content.ts';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.PCST_SUPABASE_URL, process.env.PCST_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));
const CONCURRENCY = Number(args.find((a) => a.startsWith('--jobs='))?.split('=')[1]) || 3;

const isSingleCity = (c) => Boolean(c) && Boolean(c.trim()) && !/[,·&/+]| and | to /i.test(c);
const slugify = (s) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* ── seed ─────────────────────────────────────────────────────────── */

const { data: trips, error: tripErr } = await db
  .from('trips')
  .select('city, country_id, status, subjects(name), countries(name)')
  .eq('status', 'published');
if (tripErr) throw new Error(tripErr.message);

const wanted = new Map();
for (const t of trips ?? []) {
  if (!isSingleCity(t.city)) continue;
  const name = t.city.trim();
  const slug = slugify(name);
  const entry = wanted.get(slug) ?? {
    name, slug, country_id: t.country_id ?? null,
    country: t.countries?.name ?? null, subjects: [],
  };
  if (t.subjects?.name && !entry.subjects.includes(t.subjects.name)) entry.subjects.push(t.subjects.name);
  wanted.set(slug, entry);
}

const { data: existing } = await db.from('cities').select('slug');
const have = new Set((existing ?? []).map((c) => c.slug));
const toAdd = Array.from(wanted.values()).filter((c) => !have.has(c.slug));

if (toAdd.length) {
  const { error } = await db
    .from('cities')
    .insert(toAdd.map(({ name, slug, country_id }) => ({ name, slug, country_id })));
  if (error) throw new Error(`seeding cities failed: ${error.message}`);
  console.log(`${toAdd.length} city page(s) created: ${toAdd.map((c) => c.name).join(', ')}\n`);
} else {
  console.log('every city already has a page\n');
}

/* ── generate ─────────────────────────────────────────────────────── */

const { data: cities, error: cityErr } = await db
  .from('cities')
  .select('id, name, slug, intro, countries(name)')
  .order('name');
if (cityErr) throw new Error(cityErr.message);

let queue = cities ?? [];
if (only.length) queue = queue.filter((c) => only.includes(c.slug) || only.includes(c.name.toLowerCase()));
if (!force) queue = queue.filter((c) => !c.intro);

if (!queue.length) {
  console.log('nothing to write — every city already has content (use --force to rewrite)');
  process.exit(0);
}

console.log(`${queue.length} city page(s) to write, ${CONCURRENCY} at a time\n`);

let done = 0;
const failures = [];
const started = Date.now();

async function write(city, index) {
  const label = `[${index + 1}/${queue.length}] ${city.name}`;
  const meta = wanted.get(city.slug);
  const subjects = meta?.subjects ?? [];
  const country = city.countries?.name ?? meta?.country ?? null;

  try {
    const content = await draftCityContent({ name: city.name, country, subjects });
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
    if (error) throw new Error(error.message);
    done++;
    console.log(`${label} — written (${subjects.length} subject${subjects.length === 1 ? '' : 's'}${country ? `, ${country}` : ''})`);
  } catch (e) {
    failures.push(`${city.name}: ${e.message}`);
    console.log(`${label} — FAILED: ${e.message}`);
  }
}

// A small worker pool: Claude calls are the slow part, the writes are trivial.
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (next < queue.length) {
      const i = next++;
      await write(queue[i], i);
    }
  })
);

console.log('\n──────────────────────────────────────────');
console.log(`${done} city page(s) written, ${failures.length} failed, in ${((Date.now() - started) / 60000).toFixed(1)} min`);
if (failures.length) for (const f of failures) console.log(`  ${f}`);

/* ── rebuild the public pages ─────────────────────────────────────── */

const secret = process.env.PCST_REVALIDATE_SECRET;
const site = process.env.PCST_SITE_URL ?? 'https://pcst-platform.vercel.app';
if (secret && done > 0) {
  try {
    const res = await fetch(`${site}/api/revalidate?secret=${encodeURIComponent(secret)}&scope=taxonomy`, {
      method: 'POST',
      cache: 'no-store',
    });
    console.log(res.ok ? 'public pages revalidated' : `revalidate returned ${res.status}`);
  } catch {
    console.log('revalidate call failed — the public pages will update on the next deploy');
  }
}
