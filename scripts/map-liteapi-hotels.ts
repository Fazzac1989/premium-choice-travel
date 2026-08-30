/**
 * Match our 62 UAE hotels to the same properties in LiteAPI's catalogue.
 *
 * Matching on name alone is not safe here. UAE resorts cluster — Yas Island
 * has a Hilton, a W, a Crowne Plaza and a WB within a few hundred metres, and
 * they share most of their words. An earlier version of this script paired
 * Jumeirah Saadiyat with Park Hyatt and gave three of our hotels the same
 * supplier code.
 *
 * So a match must agree on two independent things: where the hotel is, and
 * what it is called. Coordinates come from Google Place Details via the place
 * id each hotel already carries; candidates come from LiteAPI's radius search
 * around that point; and a candidate is only accepted if it is close AND its
 * name genuinely matches. Anything else is left unmapped and priced by hand,
 * which costs nothing but a missing price.
 *
 * Two of our hotels can never share a supplier code — if that happens, both
 * are dropped, because it means at least one is wrong.
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
const googleKey = process.env.GOOGLE_PLACES_API_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');
if (!apiKey) throw new Error('Missing LITEAPI_KEY — add it to .env.local first.');
if (!googleKey) throw new Error('Missing GOOGLE_PLACES_API_KEY — coordinates come from there.');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const dry = process.argv.includes('--dry');
const BASE = 'https://api.liteapi.travel/v3.0';

/** Close enough to be the same building, far enough to allow sloppy geocoding. */
const MAX_METRES = 1200;
/** Two names agreeing in both directions — different hotels never score this. */
const MIN_NAME = 0.7;
/**
 * Suppliers add qualifiers we do not carry: "by IHG", "at Bluewaters".
 * Within a few dozen metres those describe the same building, so a name
 * contained in the other counts too — but only at very close range, where a
 * neighbouring hotel cannot be mistaken for it.
 */
const CONTAINED_METRES = 250;
const MIN_CONTAINED = 0.8;

async function coordsFor(placeId: string) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=location`, {
    headers: { 'X-Goog-Api-Key': googleKey! },
  });
  if (!res.ok) return null;
  const j: any = await res.json();
  const loc = j?.location;
  return loc ? { lat: Number(loc.latitude), lng: Number(loc.longitude) } : null;
}

async function nearby(lat: number, lng: number) {
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    radius: '2000',
    limit: '100',
  });
  const res = await fetch(`${BASE}/data/hotels?${qs}`, {
    headers: { 'X-API-Key': apiKey!, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`LiteAPI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const json: any = await res.json();
  return (json?.data ?? []) as any[];
}

function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Strip the words every UAE resort shares so they cannot carry a match on
 * their own — "Hilton Abu Dhabi Yas Island" and "W Abu Dhabi - Yas Island"
 * are 80% identical until the location words come out.
 */
const NOISE = new Set([
  'the', 'a', 'an', 'and', 'hotel', 'hotels', 'resort', 'resorts', 'spa', 'by', 'at', 'collection',
  'luxury', 'suites', 'villas', 'beach', 'island', 'city', 'dubai', 'abu', 'dhabi', 'sharjah',
  'ajman', 'fujairah', 'ras', 'al', 'khaimah', 'umm', 'quwain', 'uae', 'inclusive', 'all',
]);

function words(s: string) {
  return s
    .toLowerCase()
    // Le Méridien and Le Meridien are the same hotel.
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
  return {
    /** Agreement in both directions. */
    both: shared / Math.max(A.length, B.size),
    /** The shorter name sitting inside the longer one. */
    contained: shared / Math.min(A.length, B.size),
  };
}

type Candidate = { id: string; name: string; metres: number; score: number; contained: number };

/** Same building, on the evidence of where it is and what it is called. */
function isMatch(c: Candidate) {
  if (c.metres <= MAX_METRES && c.score >= MIN_NAME) return true;
  return c.metres <= CONTAINED_METRES && c.contained >= MIN_CONTAINED;
}

async function main() {
  const { data: hotels, error } = await db
    .from('hotels')
    .select('id,name,emirate,place_id')
    .not('emirate', 'is', null)
    .order('name');
  if (error) throw new Error(error.message);

  const chosen = new Map<string, { hotelId: number; name: string; best: Candidate }>();
  const rejected: string[] = [];
  const conflicts: string[] = [];

  for (const h of hotels ?? []) {
    if (!h.place_id) {
      rejected.push(`${h.name} — no Google place id to locate it`);
      continue;
    }
    const point = await coordsFor(h.place_id);
    if (!point) {
      rejected.push(`${h.name} — Google returned no coordinates`);
      continue;
    }

    let candidates: Candidate[] = [];
    try {
      candidates = (await nearby(point.lat, point.lng))
        .filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude))
        .map((c) => ({
          id: String(c.id),
          name: String(c.name ?? ''),
          metres: Math.round(metresBetween(point.lat, point.lng, Number(c.latitude), Number(c.longitude))),
          score: nameScores(h.name, String(c.name ?? '')).both,
          contained: nameScores(h.name, String(c.name ?? '')).contained,
        }));
    } catch (e: any) {
      rejected.push(`${h.name} — lookup failed: ${e.message}`);
      continue;
    }

    const viable = candidates
      .filter(isMatch)
      .sort((a, b) => b.score - a.score || a.metres - b.metres);

    const best = viable[0];
    if (!best) {
      const near = candidates.sort((a, b) => a.metres - b.metres)[0];
      rejected.push(
        `${h.name} — nothing both close and same-named` +
          (near ? ` (nearest: ${near.name}, ${near.metres}m, name ${(near.score * 100).toFixed(0)}%)` : ''),
      );
      continue;
    }

    // Two of ours cannot be the same property in theirs.
    const taken = chosen.get(best.id);
    if (taken) {
      chosen.delete(best.id);
      conflicts.push(`${best.id} claimed by both "${taken.name}" and "${h.name}" — both left unmapped`);
      continue;
    }
    chosen.set(best.id, { hotelId: h.id, name: h.name, best });
  }

  console.log('── matched ──');
  for (const [code, m] of Array.from(chosen)) {
    console.log(`  ✓ ${m.name} → ${code} (${m.best.name}) · ${m.best.metres}m · name ${(m.best.score * 100).toFixed(0)}%`);
  }
  if (conflicts.length) {
    console.log('\n── conflicts, both dropped ──');
    conflicts.forEach((c) => console.log(`  ! ${c}`));
  }
  console.log('\n── unmapped, priced by hand ──');
  rejected.forEach((r) => console.log(`  ✗ ${r}`));

  if (!dry) {
    // Clear every code first, so a hotel that no longer matches loses its old
    // one rather than keeping a stale mapping.
    const { error: clearErr } = await db
      .from('hotels')
      .update({ supplier_code: null })
      .not('emirate', 'is', null);
    if (clearErr) {
      if (/column|schema cache/i.test(clearErr.message)) {
        throw new Error(
          `supplier_code column is missing — paste supabase/RUN-ME.sql (migration 013) into the Supabase SQL editor first.\n(${clearErr.message})`,
        );
      }
      throw new Error(clearErr.message);
    }
    for (const [code, m] of Array.from(chosen)) {
      const { error: upErr } = await db.from('hotels').update({ supplier_code: code }).eq('id', m.hotelId);
      if (upErr) throw new Error(`${m.name}: ${upErr.message}`);
    }
  }

  console.log('\n────────── LITEAPI MAPPING REPORT ──────────');
  console.log(`Mapped:    ${chosen.size}`);
  console.log(`Conflicts: ${conflicts.length * 2} hotels dropped`);
  console.log(`Unmapped:  ${rejected.length}`);
  console.log(`Coverage:  ${chosen.size}/${hotels?.length ?? 0}`);
  if (dry) console.log('\nDry run — nothing written.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
