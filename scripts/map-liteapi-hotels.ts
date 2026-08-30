/**
 * Match our 62 UAE hotels to the same properties in LiteAPI's catalogue.
 *
 * Every hotel already carries a Google Place ID from the photography work, and
 * LiteAPI's hotel lookup accepts one — so the match is exact rather than a
 * fuzzy name comparison. Name-and-city search is only the fallback, and a
 * fallback match is reported for review rather than trusted silently.
 *
 * A hotel with no confident match is left unmapped, which simply means its
 * page never shows a price. That is the safe default.
 *
 * Usage:
 *   npx tsx scripts/map-liteapi-hotels.ts --dry   # report, write nothing
 *   npx tsx scripts/map-liteapi-hotels.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.LITEAPI_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');
if (!apiKey) throw new Error('Missing LITEAPI_KEY — add it to .env.local first.');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const dry = process.argv.includes('--dry');
const BASE = 'https://api.liteapi.travel/v3.0';

async function lookup(params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, limit: '25' });
  const res = await fetch(`${BASE}/data/hotels?${qs}`, {
    headers: { 'X-API-Key': apiKey!, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`LiteAPI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json: any = await res.json();
  return (json?.data ?? []) as any[];
}

/** Loose comparison so "The Ritz-Carlton, Dubai" matches "Ritz Carlton Dubai". */
function normalise(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|hotel|resort|spa|by|collection|a luxury|luxury)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameScore(a: string, b: string) {
  const A = Array.from(new Set(normalise(a).split(' ').filter(Boolean)));
  const B = new Set(normalise(b).split(' ').filter(Boolean));
  if (!A.length || !B.size) return 0;
  const shared = A.filter((w) => B.has(w)).length;
  return shared / Math.min(A.length, B.size);
}

async function main() {
  const { data: hotels, error } = await db
    .from('hotels')
    .select('id,name,emirate,area,place_id,supplier_code')
    .not('emirate', 'is', null)
    .order('name');
  if (error) throw new Error(error.message);

  const report: string[] = [];
  let exact = 0;
  let fuzzy = 0;
  let missed = 0;

  for (const h of hotels ?? []) {
    let match: any = null;
    let how = '';

    // 1. The Google Place ID we already hold — an identity match.
    if (h.place_id) {
      try {
        const byPlace = await lookup({ placeId: h.place_id });
        if (byPlace.length === 1) {
          match = byPlace[0];
          how = 'place id';
        } else if (byPlace.length > 1) {
          const best = byPlace
            .map((c) => ({ c, s: nameScore(h.name, c.name ?? '') }))
            .sort((a, b) => b.s - a.s)[0];
          if (best.s >= 0.6) {
            match = best.c;
            how = 'place id + name';
          }
        }
      } catch (e: any) {
        report.push(`  ! ${h.name}: place lookup failed — ${e.message}`);
      }
    }

    // 2. Fall back to name within the emirate, and only accept a strong match.
    if (!match) {
      try {
        const byName = await lookup({ countryCode: 'AE', hotelName: h.name });
        const best = byName
          .map((c) => ({ c, s: nameScore(h.name, c.name ?? '') }))
          .sort((a, b) => b.s - a.s)[0];
        if (best && best.s >= 0.75) {
          match = best.c;
          how = `name ${(best.s * 100).toFixed(0)}%`;
        }
      } catch (e: any) {
        report.push(`  ! ${h.name}: name lookup failed — ${e.message}`);
      }
    }

    if (!match) {
      missed++;
      report.push(`  ✗ ${h.name} — no confident match, left unmapped`);
      continue;
    }

    if (how === 'place id') exact++;
    else fuzzy++;

    report.push(`  ${how === 'place id' ? '✓' : '~'} ${h.name} → ${match.id} (${match.name}) [${how}]`);

    if (!dry) {
      const { error: upErr } = await db.from('hotels').update({ supplier_code: match.id }).eq('id', h.id);
      if (upErr) {
        if (/column|schema cache/i.test(upErr.message)) {
          throw new Error(
            `supplier_code column is missing — paste supabase/RUN-ME.sql (migration 013) into the Supabase SQL editor first.\n(${upErr.message})`,
          );
        }
        throw new Error(`${h.name}: ${upErr.message}`);
      }
    }
  }

  console.log(report.join('\n'));
  console.log('\n────────── LITEAPI MAPPING REPORT ──────────');
  console.log(`Exact (Google place id): ${exact}`);
  console.log(`Name match — review these: ${fuzzy}`);
  console.log(`Unmapped — priced by hand: ${missed}`);
  console.log(`Coverage: ${exact + fuzzy}/${hotels?.length ?? 0}`);
  if (dry) console.log('\nDry run — nothing written.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
