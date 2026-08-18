/**
 * Idempotent seed. Safe to re-run — upserts by unique keys.
 *  1. Creates the admin login (ADMIN_EMAIL / ADMIN_PASSWORD from .env.local).
 *  2. Loads the sample destinations and packages from lib/sample-data.ts.
 *
 * Usage: npm run seed
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local to create the admin login.');
    process.exit(1);
  }

  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw new Error(`listUsers: ${listError.message}`);

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    console.log(`✓ Admin user already exists: ${email}`);
    return;
  }
  const { error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  console.log(`✓ Created admin user ${email}`);
}

async function seedCatalogue() {
  const { sampleDestinations, samplePackages } = await import('../lib/sample-data');

  const destIdBySlug = new Map<string, number>();
  let expansionColumnsMissing = false;

  for (const d of sampleDestinations) {
    const basicRow = {
      slug: d.slug,
      name: d.name,
      region: d.region,
      blurb: d.blurb,
      hero_image: d.heroImage,
      featured: d.featured,
      sort_order: d.sortOrder,
      intro: d.intro ?? [],
      when_to_travel: d.whenToTravel ?? [],
      culture: d.culture ?? [],
    };
    const expansionRow = {
      ...basicRow,
      strapline: d.strapline ?? null,
      tags: d.tags ?? [],
      seasonality: d.seasonality ?? { best: [], good: [], possible: [] },
      sub_destinations: d.subDestinations ?? [],
      experiences: d.experiences ?? [],
      stay: d.stay ?? [],
      journey_ideas: d.journeyIdeas ?? [],
      gallery: d.gallery ?? [],
      priority_rank: d.priorityRank ?? 999,
      published: d.published ?? true,
    };

    let res = await db
      .from('destinations')
      .upsert(expansionColumnsMissing ? basicRow : expansionRow, { onConflict: 'slug' })
      .select('id, slug')
      .single();

    if (res.error && /column|schema cache/i.test(res.error.message)) {
      expansionColumnsMissing = true;
      res = await db.from('destinations').upsert(basicRow, { onConflict: 'slug' }).select('id, slug').single();
    }
    if (res.error || !res.data) throw new Error(`destination ${d.slug}: ${res.error?.message}`);
    destIdBySlug.set(res.data.slug, res.data.id);
    console.log(`✓ Destination ${d.name}`);
  }

  if (expansionColumnsMissing) {
    console.warn(
      '\n⚠ Some destination columns are missing — run supabase/RUN-ME.sql in the SQL editor, then `npm run seed` again to store the full guides. (The website still shows full content from the built-in catalogue meanwhile.)\n'
    );
  }

  for (const p of samplePackages) {
    const { error } = await db.from('packages').upsert(
      {
        slug: p.slug,
        title: p.title,
        tagline: p.tagline,
        destination_id: destIdBySlug.get(p.destinationSlug) ?? null,
        brand: p.brand,
        category: p.category,
        nights: p.nights,
        days: p.days,
        price_from: p.priceFrom,
        currency: p.currency,
        hero_image: p.heroImage,
        gallery: p.gallery,
        overview: p.overview,
        highlights: p.highlights,
        includes: p.includes,
        excludes: p.excludes,
        itinerary: p.itinerary,
        hotel_name: p.hotelName,
        board_basis: p.boardBasis,
        featured: p.featured,
        status: p.status,
      },
      { onConflict: 'slug' }
    );
    if (error) throw new Error(`package ${p.slug}: ${error.message}`);
    console.log(`✓ Package ${p.title}`);
  }
}

/**
 * Starter editorial hotels & experiences (no images — upload real ones in the
 * admin; no rate/availability claims). Links them onto matching journey stages.
 * Skips gracefully until migration 005 is applied.
 */
async function seedStays() {
  const { data: dests } = await db.from('destinations').select('id, slug');
  const destId = (slug: string) => dests?.find((d) => d.slug === slug)?.id ?? null;

  const hotels = [
    { dest: 'maldives', name: 'Hard Rock Hotel Maldives', area: 'South Malé Atoll', style: 'Family lifestyle resort', description: 'Speedboat-only transfers and the Crossroads marina on the doorstep — the easiest Maldives arrival there is.' },
    { dest: 'maldives', name: 'Varu by Atmosphere', area: 'North Malé Atoll', style: 'Premium all-inclusive', description: 'A genuine premium all-inclusive with a vivid house reef — sign nothing all week.' },
    { dest: 'thailand', name: 'The Sarojin', area: 'Khao Lak', style: 'Boutique beachfront', description: 'Grown-up serenity on a quiet stretch of sand, an hour north of Phuket airport.' },
    { dest: 'thailand', name: 'Rayavadee', area: 'Railay, Krabi', style: 'Luxury resort', description: 'Pavilions between limestone cliffs and three beaches — arrival is by boat, and it feels like it.' },
  ];
  const experiences = [
    { dest: 'maldives', title: 'Sandbank picnic', body: 'A private strip of white sand, a cool box, and nothing else on the horizon.' },
    { dest: 'maldives', title: 'Sunset dolphin cruise', body: 'Spinner dolphins ride the bow wave most evenings.' },
    { dest: 'thailand', title: 'Phi Phi early-bird speedboat', body: 'Maya Bay and Pileh Lagoon before the crowds arrive.' },
    { dest: 'thailand', title: 'Ethical elephant sanctuary visit', body: 'Feed and walk with rescued elephants at accredited sanctuaries.' },
  ];

  const hotelIds = new Map<string, number>();
  for (const h of hotels) {
    const destination_id = destId(h.dest);
    const { data: existing, error } = await db.from('hotels').select('id').eq('name', h.name).maybeSingle();
    if (error) {
      console.warn('⚠ hotels/experiences tables not migrated yet — run supabase/RUN-ME.sql, then npm run seed again.');
      return;
    }
    if (existing) {
      hotelIds.set(h.name, existing.id);
      continue;
    }
    const { data: created } = await db
      .from('hotels')
      .insert({ destination_id, name: h.name, area: h.area, style: h.style, description: h.description })
      .select('id')
      .single();
    if (created) hotelIds.set(h.name, created.id);
    console.log(`✓ Hotel ${h.name}`);
  }
  const expIds = new Map<string, number>();
  for (const x of experiences) {
    const { data: existing } = await db.from('experiences').select('id').eq('title', x.title).maybeSingle();
    if (existing) {
      expIds.set(x.title, existing.id);
      continue;
    }
    const { data: created } = await db
      .from('experiences')
      .insert({ destination_id: destId(x.dest), title: x.title, body: x.body })
      .select('id')
      .single();
    if (created) expIds.set(x.title, created.id);
    console.log(`✓ Experience ${x.title}`);
  }

  // Link onto journey stages (only where not already linked).
  const links: { slug: string; stageMatch: string; hotels?: string[]; experiences?: string[] }[] = [
    { slug: 'hard-rock-hotel-maldives', stageMatch: 'Arrival', hotels: ['Hard Rock Hotel Maldives'], experiences: [] },
    { slug: 'hard-rock-hotel-maldives', stageMatch: 'Island hopping', experiences: ['Sandbank picnic', 'Sunset dolphin cruise'] },
    { slug: 'varu-by-atmosphere-maldives', stageMatch: 'Welcome', hotels: ['Varu by Atmosphere'] },
    { slug: 'thailand-island-hopping', stageMatch: 'Phi Phi', experiences: ['Phi Phi early-bird speedboat'] },
    { slug: 'thailand-island-hopping', stageMatch: 'Krabi', hotels: ['Rayavadee'] },
  ];
  for (const link of links) {
    const { data: pkg } = await db.from('packages').select('id, itinerary').eq('slug', link.slug).maybeSingle();
    if (!pkg?.itinerary) continue;
    let changed = false;
    const itinerary = (pkg.itinerary as any[]).map((day) => {
      if (!`${day.label} ${day.title}`.includes(link.stageMatch)) return day;
      const hotelIdList = (link.hotels ?? []).map((n) => hotelIds.get(n)).filter(Boolean);
      const expIdList = (link.experiences ?? []).map((n) => expIds.get(n)).filter(Boolean);
      if (hotelIdList.length && !(day.hotelIds ?? []).length) {
        day.hotelIds = hotelIdList;
        changed = true;
      }
      if (expIdList.length && !(day.experienceIds ?? []).length) {
        day.experienceIds = expIdList;
        changed = true;
      }
      return day;
    });
    if (changed) {
      await db.from('packages').update({ itinerary }).eq('id', pkg.id);
      console.log(`✓ Linked stays/experiences on ${link.slug}`);
    }
  }
}

async function main() {
  await seedAdminUser();
  await seedCatalogue();
  await seedStays();
  console.log('\nSeed complete. Sign in at /admin/login');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
