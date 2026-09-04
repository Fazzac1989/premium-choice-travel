/**
 * Attach real photography to every UAE hotel — and to every restaurant we
 * list inside it — using the Google Places API.
 *
 * Each hotel gets its Google place id (kept indefinitely, as Google allows)
 * plus a set of photo handles. Each named restaurant is looked up as its own
 * place, so "Nobu at Atlantis" gets Nobu's photos rather than a lobby shot.
 * The images themselves are streamed live through /api/place-photo.
 *
 * Room photography is deliberately NOT guessed here: Places photos carry no
 * room-category labels, and captioning an anonymous suite photo as a named
 * category would be a fiction. Room images arrive with the bed-bank content
 * feed, which tags them properly.
 *
 * Re-run monthly to refresh handles (Google content is short-cache only).
 *
 * Usage:
 *   npx tsx scripts/hotel-photos.ts                  # hotels missing photos
 *   npx tsx scripts/hotel-photos.ts --refresh        # everything, refreshed
 *   npx tsx scripts/hotel-photos.ts --only atlantis
 *   npx tsx scripts/hotel-photos.ts --limit 5
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { findPlace, getPlacePhotos, hasPlacesKey } from '../lib/images/google-places';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');
if (!hasPlacesKey()) {
  console.error(
    [
      'GOOGLE_PLACES_API_KEY is not set.',
      '',
      'Add it to .env.local (and to Vercel → Settings → Environment Variables',
      'for the live site). Setup instructions are in docs/hotel-photography.md.',
    ].join('\n'),
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const refresh = args.includes('--refresh');
const only = args.includes('--only') ? String(args[args.indexOf('--only') + 1] ?? '').toLowerCase() : '';
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;

/** Google content may be cached briefly, so handles are refreshed monthly. */
const STALE_AFTER_DAYS = 25;
const MAX_HOTEL_PHOTOS = 10;
const CONCURRENCY = 3;

function isStale(at: string | null) {
  if (!at) return true;
  return (Date.now() - new Date(at).getTime()) / 86_400_000 > STALE_AFTER_DAYS;
}

async function photosFor(hotel: any) {
  if (hotel.place_id && !refresh) {
    const photos = await getPlacePhotos(hotel.place_id);
    return { placeId: hotel.place_id, photos, name: hotel.name };
  }
  const bias = `${hotel.area ? `${hotel.area}, ` : ''}${hotel.emirate}, United Arab Emirates`;
  // Directory names carry brand suffixes — "Bab Al Shams, A Rare Finds Desert
  // Resort" — that Google's text search reads too literally and misses on.
  // Falling back to the name before the first comma finds them.
  // A narrow area bias can also miss — "Al Qudra desert" is not how Google
  // files it — so the last attempt drops back to just the emirate.
  const short = hotel.name.split(',')[0].trim();
  const wide = `${hotel.emirate}, United Arab Emirates`;
  const attempts: [string, string][] = [
    [hotel.name, bias],
    ...(short !== hotel.name ? ([[short, bias]] as [string, string][]) : []),
    [short, wide],
  ];
  let match = null;
  for (const [q, b] of attempts) {
    match = await findPlace(q, b);
    if (match) break;
  }
  if (!match) return null;
  return { placeId: match.placeId, photos: match.photos, name: match.displayName };
}

/** Look each venue up as its own place, inside its hotel, in its emirate. */
async function restaurantPhotos(hotel: any) {
  const venues: any[] = Array.isArray(hotel.restaurants) ? hotel.restaurants : [];
  const out: any[] = [];
  for (const v of venues) {
    if (!v?.heading) continue;
    if (v.photo && !refresh) {
      out.push(v);
      continue;
    }
    try {
      const match = await findPlace(`${v.heading} restaurant ${hotel.name}`, `${hotel.emirate}, United Arab Emirates`);
      const best = match?.photos?.[0];
      // Only keep a photo if Google matched a place inside the right hotel —
      // a same-name venue in another emirate is worse than no photo at all.
      const trustworthy = match && match.address.toLowerCase().includes(String(hotel.emirate).toLowerCase());
      out.push(
        trustworthy && best
          ? { ...v, placeId: match!.placeId, photo: best.name, attribution: best.attribution }
          : { heading: v.heading, body: v.body },
      );
    } catch {
      out.push({ heading: v.heading, body: v.body });
    }
  }
  return out;
}

async function main() {
  const { data: rows, error } = await db.from('hotels').select('*').not('emirate', 'is', null);
  if (error) throw new Error(error.message);

  let queue = (rows ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name));
  if (only) queue = queue.filter((h: any) => h.name.toLowerCase().includes(only));
  if (!refresh) queue = queue.filter((h: any) => !h.photos?.length || isStale(h.photos_refreshed_at));
  queue = queue.slice(0, limit);

  console.log(`${queue.length} hotel${queue.length === 1 ? '' : 's'} to photograph${refresh ? ' (refresh)' : ''}`);
  if (!queue.length) return;

  let hotelsDone = 0;
  let hotelPhotos = 0;
  let venuePhotos = 0;
  const unmatched: string[] = [];
  const failures: string[] = [];

  const worker = async () => {
    for (;;) {
      const h = queue.shift();
      if (!h) return;
      try {
        const found = await photosFor(h);
        if (!found) {
          unmatched.push(h.name);
          console.warn(`? ${h.name} — no Google place matched`);
          continue;
        }
        // Keep our cached copies for any handle that survived the refresh, so
        // the photo cache does not refetch a picture it already holds.
        const cached = new Map<string, any>((Array.isArray(h.photos) ? h.photos : []).map((p: any) => [p.name, p]));
        const photos = found.photos.slice(0, MAX_HOTEL_PHOTOS).map((p) => {
          const old = cached.get(p.name);
          return old?.url ? { ...p, url: old.url, path: old.path, cachedAt: old.cachedAt } : p;
        });
        const restaurants = await restaurantPhotos(h);
        const withPhotos = restaurants.filter((r: any) => r.photo).length;

        const { error: upErr } = await db
          .from('hotels')
          .update({
            place_id: found.placeId,
            photos,
            photos_refreshed_at: new Date().toISOString(),
            restaurants,
            // 'image' is left alone for a hand-picked photograph. The pages read
            // the card and hero straight from 'photos', so if the Places key
            // ever goes missing they fall back to scenery rather than to a
            // proxy URL that can no longer be served.
          })
          .eq('id', h.id);
        if (upErr) throw new Error(upErr.message);

        hotelsDone++;
        hotelPhotos += photos.length;
        venuePhotos += withPhotos;
        console.log(`✓ ${h.name} — ${photos.length} hotel photos, ${withPhotos}/${restaurants.length} venues`);
      } catch (e: any) {
        failures.push(`${h.name}: ${e.message}`);
        console.error(`✗ ${h.name}: ${e.message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('\n────────── PHOTOGRAPHY REPORT ──────────');
  console.log(`Hotels: ${hotelsDone} · Hotel photos: ${hotelPhotos} · Restaurant photos: ${venuePhotos}`);
  if (unmatched.length) console.log(`No Google match (add manually): ${unmatched.join(', ')}`);
  if (failures.length) console.log(`\nFailures:\n${failures.join('\n')}`);
  console.log('\nRoom-category photography still needs the bed-bank content feed or the hotel’s own media kit.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
