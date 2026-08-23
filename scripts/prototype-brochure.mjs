/**
 * Build the prototype brochure from real published trips.
 *
 *   npx tsx scripts/prototype-brochure.mjs
 *   npx tsx scripts/prototype-brochure.mjs --slug my-brochure --trips japan-art-trip,iceland
 *
 * Uses the same planner and the same copy editor the admin uses, so what comes
 * out is what an administrator would get from the wizard — this only stands in
 * for the clicking.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { planPages, padToSpread, checkTrips } from '../lib/brochure/plan.ts';
import { composeTripCopy, flagUntraceable } from '../lib/brochure/compose.ts';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.PCST_SUPABASE_URL, process.env.PCST_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`)) ?? null;
  if (hit) return hit.split('=').slice(1).join('=');
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const SLUG = argOf('slug', 'prototype-collection');
const TITLE = argOf('title', 'The 2027 Collection');
const SUBTITLE = argOf('subtitle', 'The world is your classroom');
const DETAIL = argOf('detail', 'standard');
const CLIENT = argOf('client', '');

// A spread of subjects and continents, so the prototype shows the range.
const DEFAULT_SLUGS = [
  'japan-art-design-technology',
  'stunning-geography-trip-to-iceland',
  'athens',
  'service-learning-cape-town',
  'creative-arts-and-musical-theatre-tour-to-new-york',
  'hongkong-business-studies',
];

const wanted = (argOf('trips', '') || DEFAULT_SLUGS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);

const TRIP_SELECT = `
  id, slug, title, status, city, duration_days, duration_nights, overview, includes,
  journey, trip_highlights, subject_id, country_id, hero_image, gallery,
  subjects(name), countries(name),
  itinerary_days(sort_order, label, title, description, display_title, summary,
                 primary_location, highlights, learning_focus, notices)
`;

/** Same mapping as lib/brochure/build.ts, which cannot be imported here (server-only). */
function toRecord(row) {
  const days = (row.itinerary_days ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d, i) => ({
      dayNumber: i + 1,
      label: d.label ?? null,
      title: d.title ?? '',
      description: d.description ?? '',
      displayTitle: d.display_title ?? null,
      summary: d.summary ?? null,
      primaryLocation: d.primary_location ?? null,
      highlights: (d.highlights ?? []).map((h) => ({
        name: h.name ?? '',
        summary: h.summary ?? '',
        conditional: Boolean(h.conditional),
        conditionalText: h.conditional_text ?? '',
      })),
      learningFocus: d.learning_focus ?? [],
      notices: d.notices ?? [],
    }));

  const hero = row.hero_image ?? null;
  const gallery = (Array.isArray(row.gallery) ? row.gallery : [])
    .map((g) => (typeof g === 'string' ? g : g?.url))
    .filter(Boolean);

  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    title: row.title,
    subject: row.subjects?.name ?? null,
    country: row.countries?.name ?? null,
    city: row.city ?? null,
    subjectId: row.subject_id ?? null,
    countryId: row.country_id ?? null,
    durationDays: row.duration_days ?? 0,
    durationNights: row.duration_nights ?? 0,
    overview: row.overview ?? [],
    includes: row.includes ?? [],
    tripHighlights: row.trip_highlights ?? [],
    journey: (row.journey ?? []).map((j) => ({ location: j.location, fromDay: j.from_day, toDay: j.to_day })),
    days,
    heroImage: hero,
    galleryImages: gallery,
    landscapeImages: [hero, ...gallery].filter(Boolean),
  };
}

const { data: rows, error } = await db.from('trips').select(TRIP_SELECT).in('slug', wanted);
if (error) {
  console.error('Could not read trips:', error.message);
  process.exit(1);
}

const bySlug = new Map(rows.map((r) => [r.slug, toRecord(r)]));
const trips = wanted.map((s) => bySlug.get(s)).filter(Boolean);

console.log(`${trips.length} of ${wanted.length} trips loaded`);
for (const missing of wanted.filter((s) => !bySlug.has(s))) console.log(`   not found: ${missing}`);
if (!trips.length) process.exit(1);

// Start clean if the prototype already exists.
await db.from('brochures').delete().eq('slug', SLUG);

const { data: brochure, error: insErr } = await db
  .from('brochures')
  .insert({
    slug: SLUG,
    title: TITLE,
    subtitle: SUBTITLE,
    kind: CLIENT ? 'custom' : 'master',
    detail_level: DETAIL,
    client_name: CLIENT || null,
    trip_ids: trips.map((t) => t.id),
    cover_image: trips.find((t) => t.heroImage)?.heroImage ?? null,
    design: { coverTheme: 'dark', showSafety: true, showApp: true, showItinerary: true },
  })
  .select('id, slug')
  .single();
if (insErr) {
  console.error('Could not create the brochure:', insErr.message);
  process.exit(1);
}

const planned = padToSpread(
  planPages({
    kind: CLIENT ? 'custom' : 'master',
    detailLevel: DETAIL,
    trips,
    design: { showSafety: true, showApp: true },
    groupBy: CLIENT ? 'none' : 'subject',
  })
);

await db.from('brochure_pages').insert(
  planned.map((p, i) => ({
    brochure_id: brochure.id,
    page_type: p.pageType,
    sort_order: i,
    trip_id: p.tripId ?? null,
    subject_id: p.subjectId ?? null,
    country_id: p.countryId ?? null,
    layout_variant: p.layoutVariant ?? 'a',
    content: p.content ?? {},
    background_image: p.backgroundImage ?? null,
  }))
);

console.log(`\n${planned.length} pages planned:`);
console.log(`   ${planned.map((p) => p.pageType).join(' · ')}`);

const warnings = checkTrips(trips, DETAIL);
if (warnings.length) {
  console.log(`\ncontent warnings:`);
  for (const w of warnings) for (const i of w.issues) console.log(`   ${w.title}: ${i}`);
}

console.log(`\nwriting copy…`);
const site = process.env.PCST_SITE_URL ?? 'https://pcst-platform.vercel.app';
const allFlags = [];

for (const trip of trips) {
  const res = await composeTripCopy(trip, DETAIL);
  if (!res.ok) {
    console.log(`   ${trip.title}: FAILED — ${res.error}`);
    continue;
  }
  const flags = flagUntraceable(res.content, trip);
  allFlags.push(...flags.map((f) => `${trip.title}: ${f}`));

  await db
    .from('brochure_pages')
    .update({
      content: {
        ...res.content,
        ctaLabel: 'Explore the full itinerary',
        ctaHref: `${site}/trips/${trip.slug}`,
        imageUrls: trip.landscapeImages.slice(0, 4),
      },
    })
    .eq('brochure_id', brochure.id)
    .eq('trip_id', trip.id);

  console.log(`   ${trip.title}`);
  console.log(`      ${res.content.headline} — ${res.content.subheadline}`);
  console.log(`      "${res.content.proposition}"`);
  console.log(`      ${res.content.highlights.length} highlights, ${res.content.conditions.length} conditions${flags.length ? `, ${flags.length} FLAGS` : ''}`);
}

if (allFlags.length) {
  console.log(`\ntraceability flags — check before publishing:`);
  for (const f of allFlags) console.log(`   ${f}`);
} else {
  console.log(`\nno traceability flags: every highlight traced back to the trip's own text.`);
}

await db.from('brochures').update({ status: 'published', visibility: 'public', published_at: new Date().toISOString() }).eq('id', brochure.id);

console.log(`\npublished: ${site}/brochures/${brochure.slug}`);
