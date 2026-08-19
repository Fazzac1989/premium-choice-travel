/**
 * Build the structured presentation layer for School Trips itineraries — the
 * scannable day cards, journey rail and trip highlights first built for Japan.
 *
 *   npx tsx scripts/structure-st-itineraries.mjs --all
 *   npx tsx scripts/structure-st-itineraries.mjs --all --force
 *   npx tsx scripts/structure-st-itineraries.mjs iceland japan-art-trip
 *   npx tsx scripts/structure-st-itineraries.mjs --all --published
 *
 * Non-destructive: it only writes the structured columns. The original
 * description, title, images, pricing, inclusions and slugs are never touched,
 * so the written itinerary a customer reads is always the operator's own copy.
 *
 * Resumable — days that are already structured are skipped unless --force, so
 * an interrupted run can simply be started again.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { extractDay, extractTripHighlights, EXTRACT_MODEL } from '../lib/itinerary/extract.ts';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.PCST_SUPABASE_URL, process.env.PCST_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);
const force = args.includes('--force');
const publishedOnly = args.includes('--published');
const CONCURRENCY = Number(args.find((a) => a.startsWith('--jobs='))?.split('=')[1]) || 3;

let slugs = args.filter((a) => !a.startsWith('--'));
if (args.includes('--all')) {
  // Drafts included by default: they are published sooner or later, and a
  // half-structured catalogue is worse than none.
  let q = db.from('trips').select('slug').order('title');
  if (publishedOnly) q = q.eq('status', 'published');
  const { data } = await q;
  slugs = (data ?? []).map((t) => t.slug);
}
if (!slugs.length) throw new Error('Pass trip slugs, or --all');

const toRow = (s) => ({
  display_title: s.displayTitle,
  summary: s.summary,
  primary_location: s.primaryLocation,
  highlights: s.highlights.map((h) => ({
    name: h.name,
    summary: h.summary,
    type: h.type,
    location: h.location,
    conditional: h.conditional,
    conditional_text: h.conditionalText,
  })),
  learning_focus: s.learningFocus,
  experience_types: s.experienceTypes,
  locations: s.locations,
  meals: s.meals,
  transport: s.transport,
  notices: s.notices,
  review_flags: s.reviewFlags,
  structured_at: new Date().toISOString(),
  structured_model: EXTRACT_MODEL,
});

async function revalidate(slug) {
  const secret = process.env.PCST_REVALIDATE_SECRET;
  const site = process.env.PCST_SITE_URL ?? 'https://pcst-platform.vercel.app';
  if (!secret) return 'skipped (no PCST_REVALIDATE_SECRET)';
  try {
    const res = await fetch(
      `${site}/api/revalidate?secret=${encodeURIComponent(secret)}&slug=${encodeURIComponent(slug)}`,
      { method: 'POST' }
    );
    return res.ok ? 'yes' : `no (${res.status})`;
  } catch {
    return 'no (unreachable)';
  }
}

/** Rebuild the journey rail and trip highlights from the structured days. */
async function rollUp(trip, days) {
  const { data: rows } = await db
    .from('itinerary_days')
    .select('id, sort_order, display_title, summary, primary_location, highlights, structured_at')
    .eq('trip_id', trip.id)
    .order('sort_order');

  const structured = (rows ?? []).filter((d) => d.structured_at);
  if (!structured.length) return;

  const journey = [];
  structured.forEach((d, i) => {
    const place = (d.primary_location ?? '').trim();
    if (!place) return;
    const dayNumber = i + 1;
    const last = journey[journey.length - 1];
    if (last && last.location.toLowerCase() === place.toLowerCase()) last.to_day = dayNumber;
    else journey.push({ location: place, from_day: dayNumber, to_day: dayNumber });
  });

  let highlights = [];
  try {
    highlights = await extractTripHighlights(
      trip.title,
      structured.map((d, i) => ({
        dayNumber: i + 1,
        title: d.display_title ?? '',
        summary: d.summary ?? '',
        highlights: (d.highlights ?? []).map((h) => h.name),
      }))
    );
  } catch (e) {
    console.log(`   highlights failed: ${e.message}`);
  }

  await db
    .from('trips')
    .update({ journey, trip_highlights: highlights, structured_at: new Date().toISOString() })
    .eq('id', trip.id);
}

async function processTrip(slug, index, total) {
  const { data: trip } = await db
    .from('trips')
    .select('id, slug, title, subjects(name), countries(name), itinerary_days(id, sort_order, label, title, description, structured_at)')
    .eq('slug', slug)
    .maybeSingle();

  if (!trip) return { slug, skipped: 'not found' };

  const days = (trip.itinerary_days ?? []).sort((a, b) => a.sort_order - b.sort_order);
  if (!days.length) return { slug, skipped: 'no itinerary days' };

  const pending = days.filter((d) => d.description?.trim() && (force || !d.structured_at));
  if (!pending.length) return { slug, skipped: 'already structured', days: days.length };

  console.log(`[${index}/${total}] ${slug} — ${pending.length} day(s)`);

  let done = 0;
  let failed = 0;
  for (const day of days) {
    if (!pending.includes(day)) continue;
    try {
      const structured = await extractDay({
        dayNumber: days.indexOf(day) + 1,
        totalDays: days.length,
        label: day.label,
        title: day.title,
        description: day.description,
        tripTitle: trip.title,
        subject: trip.subjects?.name ?? null,
        country: trip.countries?.name ?? null,
      });
      const { error } = await db.from('itinerary_days').update(toRow(structured)).eq('id', day.id);
      if (error) throw new Error(error.message);
      done++;
    } catch (e) {
      failed++;
      console.log(`   day ${days.indexOf(day) + 1} failed: ${e.message}`);
    }
  }

  await rollUp(trip, days);
  const rev = await revalidate(trip.slug);
  console.log(`[${index}/${total}] ${slug} — ${done} done, ${failed} failed, revalidated: ${rev}`);
  return { slug, done, failed };
}

console.log(`${slugs.length} trip(s), ${CONCURRENCY} at a time\n`);
const started = Date.now();

const queue = slugs.map((slug, i) => ({ slug, i: i + 1 }));
const results = [];

async function worker() {
  for (;;) {
    const item = queue.shift();
    if (!item) return;
    try {
      results.push(await processTrip(item.slug, item.i, slugs.length));
    } catch (e) {
      console.log(`[${item.i}/${slugs.length}] ${item.slug} — ERROR ${e.message}`);
      results.push({ slug: item.slug, error: e.message });
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const mins = ((Date.now() - started) / 60000).toFixed(1);
const totalDone = results.reduce((n, r) => n + (r.done ?? 0), 0);
const totalFailed = results.reduce((n, r) => n + (r.failed ?? 0), 0);
const skipped = results.filter((r) => r.skipped);

console.log(`\n──────────────────────────────────────────`);
console.log(`${totalDone} days structured, ${totalFailed} failed, in ${mins} min`);
if (skipped.length) {
  console.log(`\nskipped ${skipped.length}:`);
  for (const s of skipped) console.log(`   ${s.slug} — ${s.skipped}`);
}
const errored = results.filter((r) => r.error);
if (errored.length) {
  console.log(`\nerrored ${errored.length}:`);
  for (const s of errored) console.log(`   ${s.slug} — ${s.error}`);
}
