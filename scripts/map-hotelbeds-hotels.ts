/**
 * Match our UAE hotels to the same properties in Hotelbeds' catalogue.
 *
 * Same discipline as the LiteAPI mapper: a match must agree on WHERE the
 * hotel is (coordinates from the Google place id each hotel carries) and on
 * WHAT it is called. UAE resorts cluster — Yas Island alone has half a dozen
 * within a few hundred metres — so distance alone is never enough.
 *
 * Frugal by design, because the evaluation key allows 50 requests a day:
 *   - the UAE catalogue is fetched once and cached in
 *     lib/generated/hotelbeds-uae-hotels.json (delete it to refresh);
 *   - hotel coordinates are cached in lib/generated/hotel-coords.json.
 * A first run costs roughly a dozen Hotelbeds requests; re-runs cost none.
 *
 * Usage:
 *   npx tsx scripts/map-hotelbeds-hotels.ts            # report + JSON, write nothing to the DB
 *   npx tsx scripts/map-hotelbeds-hotels.ts --apply    # also write hotels.supplier_code
 *   npx tsx scripts/map-hotelbeds-hotels.ts --refresh  # re-download the catalogue first
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import {
  hotelbedsCredentials,
  hotelbedsDestinations,
  hotelbedsHotelsIn,
  type HotelbedsHotel,
} from '../lib/rates/hotelbeds';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleKey = process.env.GOOGLE_PLACES_API_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');
if (!hotelbedsCredentials()) throw new Error('HOTELBEDS_API_KEY / HOTELBEDS_SECRET are not set — see docs/hotelbeds.md');
if (!googleKey) throw new Error('Missing GOOGLE_PLACES_API_KEY — hotel coordinates come from there.');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const apply = process.argv.includes('--apply');
const refresh = process.argv.includes('--refresh');

const GEN = 'lib/generated';
const CATALOGUE = `${GEN}/hotelbeds-uae-hotels.json`;
const COORDS = `${GEN}/hotel-coords.json`;
const REPORT = `${GEN}/hotelbeds-codes.json`;

/** Close enough to be the same building, far enough to allow sloppy geocoding. */
const MAX_METRES = 1200;
/** Two names agreeing in both directions — different hotels never score this. */
const MIN_NAME = 0.7;
/** A name contained in the other counts too, but only at very close range. */
const CONTAINED_METRES = 250;
const MIN_CONTAINED = 0.8;

function readJson<T>(path: string, fallback: T): T {
  try {
    return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(path: string, value: unknown) {
  mkdirSync(GEN, { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

async function coordsFor(placeId: string): Promise<{ lat: number; lng: number } | null> {
  const cache = readJson<Record<string, { lat: number; lng: number }>>(COORDS, {});
  if (cache[placeId]) return cache[placeId];
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=location`, {
    headers: { 'X-Goog-Api-Key': googleKey! },
  });
  if (!res.ok) return null;
  const j: any = await res.json();
  const loc = j?.location;
  if (!loc) return null;
  const point = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
  cache[placeId] = point;
  writeJson(COORDS, cache);
  return point;
}

async function catalogue(): Promise<HotelbedsHotel[]> {
  if (!refresh) {
    const cached = readJson<HotelbedsHotel[]>(CATALOGUE, []);
    if (cached.length) {
      console.log(`Catalogue: ${cached.length} UAE hotels from ${CATALOGUE} (pass --refresh to re-download)`);
      return cached;
    }
  }
  // Each destination is cached the moment it arrives, so a rate-limit
  // failure halfway through costs one request on the re-run, not ten.
  const PARTIAL = `${GEN}/hotelbeds-uae-hotels.partial.json`;
  const partial = refresh ? {} : readJson<Record<string, HotelbedsHotel[]>>(PARTIAL, {});
  const destinations = await hotelbedsDestinations('AE');
  console.log(`Hotelbeds lists ${destinations.length} UAE destination(s): ${destinations.map((d) => `${d.name} [${d.code}]`).join(', ')}`);
  const all: HotelbedsHotel[] = [];
  for (const d of destinations) {
    const wasCached = Boolean(partial[d.code]);
    let rows = partial[d.code];
    if (!rows) {
      // A polite gap between calls — the test key also limits requests per second.
      await new Promise((r) => setTimeout(r, 1200));
      rows = await hotelbedsHotelsIn(d.code);
      partial[d.code] = rows;
      writeJson(PARTIAL, partial);
    }
    console.log(`  ${d.name}: ${rows.length} hotels${wasCached ? ' (cached)' : ''}`);
    all.push(...rows);
  }
  writeJson(CATALOGUE, all);
  console.log(`Catalogue: ${all.length} UAE hotels, cached in ${CATALOGUE}`);
  return all;
}

function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const NOISE = new Set([
  'the', 'a', 'an', 'and', 'hotel', 'hotels', 'resort', 'resorts', 'spa', 'by', 'at', 'collection',
  'luxury', 'suites', 'villas', 'beach', 'island', 'city', 'dubai', 'abu', 'dhabi', 'sharjah',
  'ajman', 'fujairah', 'ras', 'al', 'khaimah', 'umm', 'quwain', 'uae', 'inclusive', 'all',
]);

function words(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !NOISE.has(w));
}

function nameScores(a: string, b: string) {
  const A = Array.from(new Set(words(a)));
  const B = new Set(words(b));
  if (!A.length || !B.size) return { both: 0, contained: 0 };
  const shared = A.filter((w) => B.has(w)).length;
  return { both: shared / Math.max(A.length, B.size), contained: shared / Math.min(A.length, B.size) };
}

type Candidate = { code: number; name: string; metres: number; score: number; contained: number };

function isMatch(c: Candidate) {
  if (c.metres <= MAX_METRES && c.score >= MIN_NAME) return true;
  return c.metres <= CONTAINED_METRES && c.contained >= MIN_CONTAINED;
}

async function main() {
  const hotels = await catalogue();
  const located = hotels.filter((h) => h.latitude != null && h.longitude != null);

  const { data: ours, error } = await db
    .from('hotels')
    .select('id,name,emirate,place_id,supplier_code')
    .not('emirate', 'is', null)
    .order('name');
  if (error) throw new Error(error.message);

  type Match = { hotelId: number; hotel: string; code: number; hotelbedsName: string; metres: number; score: number };
  const matches: Match[] = [];
  const unmatched: { hotel: string; reason: string; nearest?: string }[] = [];

  for (const h of ours ?? []) {
    if (!h.place_id) {
      unmatched.push({ hotel: h.name, reason: 'no Google place id — run scripts/hotel-photos.ts first' });
      continue;
    }
    const point = await coordsFor(h.place_id);
    if (!point) {
      unmatched.push({ hotel: h.name, reason: 'Google returned no coordinates' });
      continue;
    }
    const candidates: Candidate[] = located
      .map((c) => {
        const { both, contained } = nameScores(h.name, c.name);
        return {
          code: c.code,
          name: c.name,
          metres: Math.round(metresBetween(point.lat, point.lng, c.latitude!, c.longitude!)),
          score: both,
          contained,
        };
      })
      .filter((c) => c.metres <= 3000)
      .sort((a, b) => b.score - a.score || a.metres - b.metres);

    const best = candidates.find(isMatch);
    if (best) {
      matches.push({ hotelId: h.id, hotel: h.name, code: best.code, hotelbedsName: best.name, metres: best.metres, score: Math.round(best.score * 100) / 100 });
      console.log(`✓ ${h.name}  →  ${best.name} [${best.code}]  ${best.metres} m, name ${Math.round(best.score * 100)}%`);
    } else {
      const nearest = candidates[0];
      unmatched.push({
        hotel: h.name,
        reason: candidates.length ? 'nothing close enough agreed on the name' : 'no Hotelbeds hotel within 3 km',
        nearest: nearest ? `${nearest.name} [${nearest.code}] ${nearest.metres} m, name ${Math.round(nearest.score * 100)}%` : undefined,
      });
      console.log(`? ${h.name}  —  ${nearest ? `nearest ${nearest.name} [${nearest.code}] at ${nearest.metres} m (${Math.round(nearest.score * 100)}%)` : 'no candidates'}`);
    }
  }

  // Two of ours can never be the same Hotelbeds hotel — drop both if it happens.
  const byCode = new Map<number, Match[]>();
  for (const m of matches) byCode.set(m.code, [...(byCode.get(m.code) ?? []), m]);
  const accepted = matches.filter((m) => byCode.get(m.code)!.length === 1);
  for (const [code, ms] of Array.from(byCode.entries())) {
    if (ms.length > 1) console.warn(`! Hotelbeds ${code} matched ${ms.map((m) => m.hotel).join(' AND ')} — both dropped`);
  }

  writeJson(REPORT, { generatedAt: new Date().toISOString(), accepted, unmatched });
  console.log(`\n${accepted.length} of ${(ours ?? []).length} hotels mapped · ${unmatched.length} left priced by hand · report in ${REPORT}`);

  if (!apply) {
    console.log('Report only — pass --apply to write supplier codes.');
    return;
  }
  let written = 0;
  for (const m of accepted) {
    const { error: upErr } = await db.from('hotels').update({ supplier_code: String(m.code) }).eq('id', m.hotelId);
    if (upErr) console.error(`✗ ${m.hotel}: ${upErr.message}`);
    else written++;
  }
  console.log(`Wrote ${written} supplier code(s). Hotels without a match keep whatever code they had.`);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
