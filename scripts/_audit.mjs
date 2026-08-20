import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.PCST_SUPABASE_URL, process.env.PCST_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/* ── trips ── */
const { data: trips } = await db
  .from('trips')
  .select('id, slug, title, status, country_id, created_at, structured_at, itinerary_days(structured_at, description), trip_images(role)')
  .order('created_at', { ascending: false });

console.log('══ TRIPS ══');
const tripIssues = [];
for (const t of trips) {
  const days = t.itinerary_days ?? [];
  const withDesc = days.filter((d) => d.description?.trim());
  const structured = days.filter((d) => d.structured_at);
  const imgs = t.trip_images ?? [];
  const hero = imgs.filter((i) => i.role === 'hero').length;
  const gallery = imgs.filter((i) => i.role === 'gallery').length;

  const issues = [];
  if (withDesc.length && structured.length < withDesc.length)
    issues.push(`itinerary NOT structured (${structured.length}/${withDesc.length})`);
  if (!hero) issues.push('no curated hero');
  if (gallery < 5) issues.push(`${gallery}/5 gallery`);
  if (!t.country_id) issues.push('NO COUNTRY SET');

  if (issues.length) tripIssues.push({ t, issues });
}
console.log(`${trips.length} trips, ${tripIssues.length} with issues:\n`);
for (const { t, issues } of tripIssues) {
  console.log(`  ${t.slug} (${t.status}, created ${t.created_at.slice(0, 10)})`);
  for (const i of issues) console.log(`     - ${i}`);
}

/* ── countries ── */
const { data: countries } = await db
  .from('countries')
  .select('id, name, slug, region, capital, intro, education_notes, climate_summary, trips(count)')
  .order('name');

console.log('\n══ COUNTRIES ══');
const cIssues = [];
for (const c of countries ?? []) {
  const issues = [];
  if (!c.capital) issues.push('no facts');
  if (!c.intro) issues.push('no editorial content (intro/education/climate)');
  if (!c.region) issues.push('no region');
  if (issues.length) cIssues.push({ c, issues });
}

// country images live in their own table
const { data: cImgs, error: cImgErr } = await db.from('country_images').select('country_id, role');
const cImgBy = new Map();
if (!cImgErr) {
  for (const i of cImgs ?? []) {
    const e = cImgBy.get(i.country_id) ?? { hero: 0, gallery: 0 };
    if (i.role === 'hero') e.hero++; else e.gallery++;
    cImgBy.set(i.country_id, e);
  }
}

console.log(`${countries.length} countries, ${cIssues.length} with content issues:\n`);
for (const { c, issues } of cIssues) {
  const im = cImgBy.get(c.id) ?? { hero: 0, gallery: 0 };
  console.log(`  ${c.slug} (${c.trips?.[0]?.count ?? 0} trips) — ${issues.join('; ')}; images ${im.hero}h/${im.gallery}g`);
}

console.log('\ncountries with NO images at all:');
for (const c of countries ?? []) {
  const im = cImgBy.get(c.id);
  if (!im) console.log(`  ${c.slug} (${c.trips?.[0]?.count ?? 0} trips)`);
}
