/**
 * Fill or refresh the 30-day Places photo cache from this machine.
 *
 * The daily cron renews a few dozen copies a day; this does the first fill
 * (or a catch-up) in one go. Each photo is one Google media call.
 *
 * Usage:
 *   npx tsx scripts/place-photo-cache.ts                 # every stale photo
 *   npx tsx scripts/place-photo-cache.ts --budget 100    # at most 100 fetches
 *   npx tsx scripts/place-photo-cache.ts --only atlantis
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { hasPlacesKey } from '../lib/images/google-places';
import { runPhotoCacheRefresh } from '../lib/images/place-photo-cache';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');
if (!hasPlacesKey()) throw new Error('GOOGLE_PLACES_API_KEY is not set — see docs/hotel-photography.md');

const args = process.argv.slice(2);
const budget = args.includes('--budget') ? Number(args[args.indexOf('--budget') + 1]) : 5000;
const only = args.includes('--only') ? String(args[args.indexOf('--only') + 1] ?? '') : '';

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

runPhotoCacheRefresh(db, { budget, only, log: (line) => console.log(line) })
  .then((r) => {
    console.log('\n────────── PHOTO CACHE REPORT ──────────');
    console.log(`Stale at start: ${r.stale} · Cached now: ${r.cached} · Still stale: ${r.remaining}`);
    console.log(`Hotels updated: ${r.hotelsUpdated} · Handles renewed: ${r.renewedHandles}`);
    if (r.failures.length) console.log(`\nFailures (${r.failures.length}):\n${r.failures.join('\n')}`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
