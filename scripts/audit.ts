/**
 * Content audit per the Destination Expansion Strategy:
 * reports coverage across destinations, journeys, images and metadata.
 *
 * Usage: npx tsx scripts/audit.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const { DESTINATION_CATALOGUE } = await import('../lib/destination-catalogue');
  const { samplePackages } = await import('../lib/sample-data');

  const ds = DESTINATION_CATALOGUE;
  const pkgCountBySlug = new Map<string, number>();
  for (const p of samplePackages) {
    pkgCountBySlug.set(p.destinationSlug, (pkgCountBySlug.get(p.destinationSlug) ?? 0) + 1);
  }

  const conceptsFor = (d: (typeof ds)[number]) =>
    (pkgCountBySlug.get(d.slug) ?? 0) + d.journeyIdeas.length;

  const rows = {
    published: ds.filter((d) => d.published).length,
    withFourPlusJourneys: ds.filter((d) => conceptsFor(d) >= 4).length,
    withTwelvePlusImages: ds.filter((d) => d.gallery.length >= 12).length,
    withEightPlusImages: ds.filter((d) => d.gallery.length >= 8).length,
    missingAltText: ds.flatMap((d) => d.gallery.filter((g) => !g.alt?.trim()).map(() => d.slug)),
    missingSeasonality: ds.filter((d) => d.seasonality.best.length === 0).map((d) => d.slug),
    missingStrapline: ds.filter((d) => !d.strapline?.trim()).map((d) => d.slug),
    missingIntro: ds.filter((d) => d.intro.length === 0).map((d) => d.slug),
    missingTags: ds.filter((d) => d.tags.length === 0).map((d) => d.slug),
    missingHero: ds.filter((d) => !d.heroImage).map((d) => d.slug),
  };

  console.log('── Destination content audit ─────────────────────────────');
  console.log(`Destinations in catalogue:        ${ds.length}`);
  console.log(`Published:                        ${rows.published}`);
  console.log(`With 4+ journey concepts:         ${rows.withFourPlusJourneys}`);
  console.log(`With 12+ gallery images:          ${rows.withTwelvePlusImages}`);
  console.log(`With 8+ gallery images:           ${rows.withEightPlusImages}`);
  console.log(`Gallery images missing alt text:  ${rows.missingAltText.length}`);
  console.log(`Missing seasonality:              ${rows.missingSeasonality.join(', ') || 'none'}`);
  console.log(`Missing strapline:                ${rows.missingStrapline.join(', ') || 'none'}`);
  console.log(`Missing intro/about copy:         ${rows.missingIntro.join(', ') || 'none'}`);
  console.log(`Missing tags:                     ${rows.missingTags.join(', ') || 'none'}`);
  console.log(`Missing hero image:               ${rows.missingHero.join(', ') || 'none'}`);

  // Broken journey links: packages referencing unknown destination slugs
  const known = new Set(ds.map((d) => d.slug));
  const orphanPkgs = samplePackages.filter((p) => p.destinationSlug && !known.has(p.destinationSlug));
  console.log(`Packages with unknown destination: ${orphanPkgs.map((p) => p.slug).join(', ') || 'none'}`);

  // Database coverage, if configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { count: destCount, error: e1 } = await db.from('destinations').select('id', { count: 'exact', head: true });
    const { count: pkgCount } = await db.from('packages').select('id', { count: 'exact', head: true });
    const { count: leadCount, error: e2 } = await db.from('ai_leads').select('id', { count: 'exact', head: true });
    console.log('── Database ──────────────────────────────────────────────');
    console.log(`Destinations in DB:               ${e1 ? 'error: ' + e1.message : destCount}`);
    console.log(`Packages in DB:                   ${pkgCount ?? '—'}`);
    console.log(`AI leads table:                   ${e2 ? 'NOT MIGRATED (run supabase/RUN-ME.sql)' : `ok (${leadCount} leads)`}`);
  } else {
    console.log('── Database: not configured in this environment ─────────');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
