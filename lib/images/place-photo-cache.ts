/**
 * A 30-day cache of Google Places photos in our own Supabase Storage.
 *
 * Google's terms allow its content to be cached for up to 30 days. Streaming
 * every photo live cost one billed media call per view per rendered width;
 * cached, each photo costs one call a month — well inside the free allowance.
 *
 * The cache lives inside the rows it belongs to: every PlacePhotoRef in
 * hotels.photos and every restaurant in hotels.restaurants carries the public
 * URL, the storage path and the time it was fetched. Nothing is stored
 * anywhere else, so an admin editing a hotel cannot orphan an index entry.
 *
 * Storage paths are unique per fetch (the CDN pins a path for a year), and
 * the previous copy is removed once the new one is up.
 *
 * Used by the daily cron (app/api/cron/place-photo-cache) and by the fill
 * script (scripts/place-photo-cache.ts), so it must not import server-only.
 */
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlacePhotoRef, VenueSection } from '@/lib/types';
import { getPhotoUri, getPlacePhotos, PlacesMediaError } from './google-places';

export const PHOTO_BUCKET = 'images';
/** Google allows 30 days; refresh a little early so no copy ever runs over. */
export const REFRESH_AFTER_DAYS = 25;
export const HOTEL_PHOTO_WIDTH = 1600;
export const VENUE_PHOTO_WIDTH = 1000;
const MAX_HOTEL_PHOTOS = 10;
const CONCURRENCY = 4;

export function isCacheFresh(cachedAt?: string | null) {
  if (!cachedAt) return false;
  const age = (Date.now() - new Date(cachedAt).getTime()) / 86_400_000;
  return age >= 0 && age < REFRESH_AFTER_DAYS;
}

type CachedCopy = { url: string; path: string; cachedAt: string };

/** Fetch one photo from Google and store our own copy. Replaces `previousPath`. */
export async function cachePhoto(
  db: SupabaseClient,
  photoName: string,
  maxWidth: number,
  previousPath?: string | null,
): Promise<CachedCopy> {
  const uri = await getPhotoUri(photoName, maxWidth);
  if (!uri) throw new PlacesMediaError(404, 'no photoUri returned');

  const img = await fetch(uri, { cache: 'no-store' });
  if (!img.ok) throw new Error(`Photo download failed (${img.status})`);
  const contentType = img.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const buffer = Buffer.from(await img.arrayBuffer());
  if (!buffer.length) throw new Error('Photo download was empty');

  const key = createHash('sha1').update(photoName).digest('hex').slice(0, 20);
  const path = `places/${key}/${Date.now()}.${ext}`;
  const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, buffer, {
    contentType,
    // Our own copy is renewed within 30 days, so the CDN may hold it that long.
    cacheControl: '2592000',
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  if (previousPath && previousPath !== path) {
    // Best effort — a leftover file costs pennies, a failed refresh costs a photo.
    await db.storage.from(PHOTO_BUCKET).remove([previousPath]).then(() => undefined, () => undefined);
  }

  const url = db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  return { url, path, cachedAt: new Date().toISOString() };
}

export type CacheReport = {
  /** Photos that needed a fetch when the run started. */
  stale: number;
  /** Photos fetched and stored this run. */
  cached: number;
  /** Hotels whose Google photo handles had expired and were renewed (free call). */
  renewedHandles: number;
  /** Hotels written back. */
  hotelsUpdated: number;
  failures: string[];
  /** Photos still stale after this run — the next run picks them up. */
  remaining: number;
};

type Task =
  | { kind: 'hotel'; hotel: any; index: number; cachedAt?: string }
  | { kind: 'venue'; hotel: any; index: number; cachedAt?: string };

/**
 * Refresh up to `budget` stale photos across the directory, oldest first.
 * Every Google media call this makes is one the pages then never make.
 */
export async function runPhotoCacheRefresh(
  db: SupabaseClient,
  opts: { budget?: number; only?: string; log?: (line: string) => void } = {},
): Promise<CacheReport> {
  const budget = Math.max(0, opts.budget ?? 40);
  const log = opts.log ?? (() => undefined);

  const { data: rows, error } = await db.from('hotels').select('*').not('emirate', 'is', null);
  if (error) throw new Error(error.message);
  let hotels: any[] = rows ?? [];
  if (opts.only) {
    const q = opts.only.toLowerCase();
    hotels = hotels.filter((h) => String(h.name).toLowerCase().includes(q));
  }

  // Everything that needs a fetch, oldest copy first (never cached = oldest of all).
  const tasks: Task[] = [];
  for (const hotel of hotels) {
    const photos: PlacePhotoRef[] = Array.isArray(hotel.photos) ? hotel.photos : [];
    photos.forEach((p, index) => {
      if (p?.name && !(p.url && isCacheFresh(p.cachedAt))) tasks.push({ kind: 'hotel', hotel, index, cachedAt: p.cachedAt });
    });
    const venues: VenueSection[] = Array.isArray(hotel.restaurants) ? hotel.restaurants : [];
    venues.forEach((v, index) => {
      if (v?.photo && !(v.photoUrl && isCacheFresh(v.photoCachedAt)))
        tasks.push({ kind: 'venue', hotel, index, cachedAt: v.photoCachedAt });
    });
  }
  tasks.sort((a, b) => new Date(a.cachedAt ?? 0).getTime() - new Date(b.cachedAt ?? 0).getTime());

  const report: CacheReport = {
    stale: tasks.length,
    cached: 0,
    renewedHandles: 0,
    hotelsUpdated: 0,
    failures: [],
    remaining: 0,
  };
  const queue = tasks.slice(0, budget);
  report.remaining = tasks.length - queue.length;
  if (!queue.length) return report;

  const touched = new Set<any>();
  const renew = new Set<any>();

  const worker = async () => {
    for (;;) {
      const task = queue.shift();
      if (!task) return;
      const { hotel } = task;
      try {
        if (task.kind === 'hotel') {
          const p: PlacePhotoRef = hotel.photos[task.index];
          const copy = await cachePhoto(db, p.name, HOTEL_PHOTO_WIDTH, p.path);
          hotel.photos[task.index] = { ...p, ...copy };
        } else {
          const v: VenueSection = hotel.restaurants[task.index];
          const copy = await cachePhoto(db, v.photo!, VENUE_PHOTO_WIDTH, v.photoPath);
          hotel.restaurants[task.index] = { ...v, photoUrl: copy.url, photoPath: copy.path, photoCachedAt: copy.cachedAt };
        }
        touched.add(hotel);
        report.cached++;
      } catch (e: any) {
        if (e instanceof PlacesMediaError && e.handleGone) {
          if (task.kind === 'hotel' && hotel.place_id) {
            renew.add(hotel);
          } else if (task.kind === 'venue') {
            // The venue's handle is dead and only a fresh Places search can
            // replace it (scripts/hotel-photos.ts --refresh). Drop it so the
            // page shows nothing rather than a broken image.
            const v: VenueSection = hotel.restaurants[task.index];
            hotel.restaurants[task.index] = { heading: v.heading, body: v.body };
            touched.add(hotel);
          }
          report.failures.push(`${hotel.name}: handle expired (${task.kind})`);
        } else {
          report.failures.push(`${hotel.name}: ${e?.message ?? e}`);
        }
        log(`✗ ${hotel.name}: ${e?.message ?? e}`);
        continue;
      }
      log(`✓ ${hotel.name} (${task.kind})`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Expired hotel handles: ask Google for the current set (an IDs-only detail
  // call, not billed) and keep whichever cached copies still match by name.
  for (const hotel of Array.from(renew)) {
    try {
      const fresh = await getPlacePhotos(hotel.place_id);
      const byName = new Map<string, PlacePhotoRef>((hotel.photos as PlacePhotoRef[]).map((p) => [p.name, p]));
      hotel.photos = fresh.slice(0, MAX_HOTEL_PHOTOS).map((f) => {
        const old = byName.get(f.name);
        return old?.url ? { ...f, url: old.url, path: old.path, cachedAt: old.cachedAt } : f;
      });
      hotel.photos_refreshed_at = new Date().toISOString();
      touched.add(hotel);
      report.renewedHandles++;
      log(`↻ ${hotel.name}: photo handles renewed (${hotel.photos.length})`);
    } catch (e: any) {
      report.failures.push(`${hotel.name}: renewing handles failed — ${e?.message ?? e}`);
    }
  }

  for (const hotel of Array.from(touched)) {
    const patch: Record<string, unknown> = { photos: hotel.photos, restaurants: hotel.restaurants };
    if (renew.has(hotel)) patch.photos_refreshed_at = hotel.photos_refreshed_at;
    const { error: upErr } = await db.from('hotels').update(patch).eq('id', hotel.id);
    if (upErr) report.failures.push(`${hotel.name}: saving failed — ${upErr.message}`);
    else report.hotelsUpdated++;
  }

  return report;
}
