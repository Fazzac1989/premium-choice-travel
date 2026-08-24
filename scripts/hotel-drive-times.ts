/**
 * Turn the written directions into a number: minutes from Dubai.
 *
 * The prose in transfer_duration already says it — "around 45-50 min drive
 * from Dubai", "about 1 hr 20 min drive from Dubai" — this reads the upper
 * bound out of it so the directory can be filtered by how far people are
 * willing to drive. Nothing is invented: a hotel whose text never mentions
 * Dubai is left null and reported, rather than guessed at.
 *
 * Usage: npx tsx scripts/hotel-drive-times.ts [--dry]
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { driveMinutesFromText } from '../lib/weekend';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const dry = process.argv.includes('--dry');


async function main() {
  const { data: rows, error } = await db.from('hotels').select('id,name,emirate,transfer_duration').not('emirate', 'is', null);
  if (error) throw new Error(error.message);

  const parsed: { name: string; emirate: string; minutes: number | null; text: string }[] = [];
  let written = 0;
  for (const h of rows ?? []) {
    const minutes = driveMinutesFromText(h.transfer_duration ?? '');
    parsed.push({ name: h.name, emirate: h.emirate, minutes, text: h.transfer_duration ?? '' });
    if (dry || !minutes) continue;

    const { error: upErr } = await db.from('hotels').update({ drive_minutes: minutes }).eq('id', h.id);
    if (upErr) {
      // A missing column would otherwise let every write fail in silence and
      // still report a full parse.
      if (/column|schema cache/i.test(upErr.message)) {
        throw new Error(
          `drive_minutes column is missing — paste supabase/RUN-ME.sql (migration 011) into the Supabase SQL editor first.\n(${upErr.message})`,
        );
      }
      throw new Error(`${h.name}: ${upErr.message}`);
    }
    written++;
  }

  parsed
    .sort((a, b) => (a.minutes ?? 9999) - (b.minutes ?? 9999))
    .forEach((p) => console.log(`${String(p.minutes ?? '—').padStart(4)} min · ${p.emirate.padEnd(15)} · ${p.name}`));

  const missing = parsed.filter((p) => !p.minutes);
  console.log('\n────────── DRIVE TIME REPORT ──────────');
  console.log(`Parsed: ${parsed.length - missing.length} / ${parsed.length}${dry ? ' (dry run — nothing written)' : ` · written: ${written}`}`);
  const buckets = { 'under 30': 0, 'under 60': 0, 'over 60': 0 };
  parsed.forEach((p) => {
    if (!p.minutes) return;
    if (p.minutes <= 30) buckets['under 30']++;
    else if (p.minutes <= 60) buckets['under 60']++;
    else buckets['over 60']++;
  });
  console.log(`Buckets: ${JSON.stringify(buckets)}`);
  if (missing.length) {
    console.log('\nNo Dubai reference — left blank, add by hand in the admin:');
    missing.forEach((m) => console.log(`  ${m.name}: "${m.text}"`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
