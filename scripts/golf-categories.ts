/**
 * Bring every golf journey's `category` into line with the golf site's one
 * trip-type list (lib/golf/catalogue.ts). Touches that one column on golf
 * rows only — unlike seed:journeys, which rewrites every field of every brand.
 *
 * Usage: npx tsx scripts/golf-categories.ts [--write]
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { golfTripType, tripTypeLabel } from '../lib/golf/catalogue';

config({ path: '.env.local' });
config({ path: '.env' });
const write = process.argv.includes('--write');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

(async () => {
  const { data, error } = await db.from('packages').select('id, slug, status, category, tags').eq('brand', 'golf');
  if (error) throw new Error(error.message);
  let changed = 0;
  for (const row of data ?? []) {
    const next = tripTypeLabel(golfTripType({ slug: row.slug, category: row.category, tags: row.tags ?? [] }));
    if (next === row.category) continue;
    changed++;
    console.log(`${row.status.padEnd(9)} ${row.slug}: "${row.category}" → "${next}"`);
    if (write) {
      const res = await db.from('packages').update({ category: next }).eq('id', row.id);
      if (res.error) throw new Error(`${row.slug}: ${res.error.message}`);
    }
  }
  console.log(`\n${changed} of ${data?.length ?? 0} golf rows ${write ? 'updated' : 'would change (dry run)'}.`);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
