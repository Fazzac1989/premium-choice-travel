/**
 * Load the 40 golf sourcing briefs (lib/golf/briefs.ts) into the admin as
 * DRAFT golf journeys, one per brief, so the product team can source them.
 *
 * Safe to re-run:
 * - a slug already used by a real journey is never touched (reported instead);
 * - a brief already loaded is left alone, so edits made in the admin survive —
 *   pass --refresh to rewrite briefs that are still drafts from the workbook;
 * - nothing is ever created or left as anything but 'draft', and no price is
 *   set (price_status stays 'on_request').
 *
 * Usage:
 *   npx tsx scripts/seed-golf-briefs.ts            dry run: prints the plan
 *   npx tsx scripts/seed-golf-briefs.ts --write    loads the drafts
 *   npx tsx scripts/seed-golf-briefs.ts --write --refresh
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { GOLF_BRIEFS } from '../lib/golf/briefs';
import { briefDestinationSlug, briefRow, briefSlug } from '../lib/golf/brief-rows';

config({ path: '.env.local' });
config({ path: '.env' });

const write = process.argv.includes('--write');
const refresh = process.argv.includes('--refresh');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local)');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  const { data: dests, error: dErr } = await db.from('destinations').select('id, slug');
  if (dErr) throw new Error(`destinations: ${dErr.message}`);
  const destId = new Map<string, number>((dests ?? []).map((d: any) => [d.slug, d.id]));

  const slugs = GOLF_BRIEFS.map(briefSlug);
  if (new Set(slugs).size !== slugs.length) throw new Error('Two briefs share a slug — fix lib/golf/briefs.ts first.');

  const { data: existing, error: eErr } = await db
    .from('packages')
    .select('id, slug, status, brand, details')
    .in('slug', slugs);
  if (eErr) throw new Error(`packages: ${eErr.message}`);
  const bySlug = new Map<string, any>((existing ?? []).map((r: any) => [r.slug, r]));

  const created: string[] = [];
  const refreshed: string[] = [];
  const kept: string[] = [];
  const collisions: string[] = [];
  const noDestination: string[] = [];

  for (const brief of GOLF_BRIEFS) {
    const slug = briefSlug(brief);
    const destSlug = briefDestinationSlug(brief);
    const id = destSlug ? destId.get(destSlug) ?? null : null;
    if (!id) noDestination.push(`${brief.id} ${brief.destination}`);
    const row = briefRow(brief, id);
    const current = bySlug.get(slug);

    if (current && !current.details?.brief) {
      collisions.push(`${brief.id} ${slug} (already a ${current.status} ${current.brand} journey)`);
      continue;
    }
    if (current && (!refresh || current.status !== 'draft')) {
      kept.push(`${brief.id} ${slug} (${current.status})`);
      continue;
    }

    if (write) {
      const res = current
        ? await db.from('packages').update(row).eq('id', current.id)
        : await db.from('packages').insert(row);
      if (res.error) throw new Error(`${brief.id} ${slug}: ${res.error.message}`);
    }
    (current ? refreshed : created).push(`${brief.id} ${slug}`);
  }

  const verb = write ? '' : ' (dry run — nothing written)';
  console.log(`\nCreated ${created.length}${verb}`);
  created.forEach((s) => console.log(`  + ${s}`));
  if (refreshed.length) {
    console.log(`Refreshed ${refreshed.length}${verb}`);
    refreshed.forEach((s) => console.log(`  ~ ${s}`));
  }
  if (kept.length) console.log(`Already loaded, left as they are: ${kept.length}`);
  if (collisions.length) {
    console.log(`Skipped — slug belongs to a real journey: ${collisions.length}`);
    collisions.forEach((s) => console.log(`  ! ${s}`));
  }
  if (noDestination.length) {
    console.log(`Saved without a destination link (no such destination row): ${noDestination.length}`);
    noDestination.forEach((s) => console.log(`  ? ${s}`));
  }
  if (!write) console.log('\nRe-run with --write to load them.');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
