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
  for (const d of sampleDestinations) {
    const { data, error } = await db
      .from('destinations')
      .upsert(
        {
          slug: d.slug,
          name: d.name,
          region: d.region,
          blurb: d.blurb,
          hero_image: d.heroImage,
          featured: d.featured,
          sort_order: d.sortOrder,
        },
        { onConflict: 'slug' }
      )
      .select('id, slug')
      .single();
    if (error) throw new Error(`destination ${d.slug}: ${error.message}`);
    destIdBySlug.set(data.slug, data.id);
    console.log(`✓ Destination ${d.name}`);
  }

  for (const p of samplePackages) {
    const { error } = await db.from('packages').upsert(
      {
        slug: p.slug,
        title: p.title,
        tagline: p.tagline,
        destination_id: destIdBySlug.get(p.destinationSlug) ?? null,
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

async function main() {
  await seedAdminUser();
  await seedCatalogue();
  console.log('\nSeed complete. Sign in at /admin/login');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
