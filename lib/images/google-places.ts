/**
 * Google Places (New) — real photography for the hotel directory.
 *
 * Why Places rather than a stock library: a staycation customer is choosing
 * between actual properties. A stock "luxury suite" captioned as a named room
 * is a lie, however pretty it is. Places returns pictures of the building,
 * the pool and the restaurant that are actually there.
 *
 * Google's terms let us keep a place id indefinitely but not the photo bytes,
 * so we store photo handles and serve every image live through
 * /api/place-photo. Attribution travels with each photo and must be shown.
 */

const PLACES = 'https://places.googleapis.com/v1';

export type PlacePhoto = {
  /** Google's photo resource name — the handle we re-fetch with. */
  name: string;
  width: number;
  height: number;
  /** Photographer / contributor, required on display. */
  attribution: string;
};

export type PlaceMatch = {
  placeId: string;
  displayName: string;
  address: string;
  photos: PlacePhoto[];
};

/** The key exists — enough for the scripts that look hotels up. */
export function hasPlacesKey() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

/**
 * Whether the websites may stream Google photos right now.
 *
 * Every photo shown is a billed Place Photo call, and the image optimiser
 * multiplies that by the number of widths it renders, so this is OFF unless
 * PLACES_PHOTOS=on is set explicitly. The key alone is not consent to spend.
 * Off means the directory falls back to curated images or the branded panel.
 */
export function isPlacesConfigured() {
  return hasPlacesKey() && process.env.PLACES_PHOTOS === 'on';
}

function key() {
  const k = process.env.GOOGLE_PLACES_API_KEY;
  if (!k) throw new Error('GOOGLE_PLACES_API_KEY is not set');
  return k;
}

function mapPhotos(photos: any[]): PlacePhoto[] {
  return (photos ?? [])
    .filter((p) => p?.name)
    .map((p) => ({
      name: p.name as string,
      width: Number(p.widthPx) || 0,
      height: Number(p.heightPx) || 0,
      attribution: String(p.authorAttributions?.[0]?.displayName ?? '').trim(),
    }));
}

/**
 * Find one place by name. `bias` narrows the search — pass the emirate so
 * "Ritz-Carlton" doesn't come back from Riyadh.
 */
export async function findPlace(query: string, bias = 'United Arab Emirates'): Promise<PlaceMatch | null> {
  const res = await fetch(`${PLACES}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key(),
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.photos',
    },
    body: JSON.stringify({
      textQuery: `${query}, ${bias}`,
      languageCode: 'en',
      regionCode: 'AE',
      maxResultCount: 1,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places search failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const place = json.places?.[0];
  if (!place?.id) return null;

  return {
    placeId: place.id,
    displayName: place.displayName?.text ?? query,
    address: place.formattedAddress ?? '',
    photos: mapPhotos(place.photos),
  };
}

/** Refresh the photo handles for a place we already have an id for. */
export async function getPlacePhotos(placeId: string): Promise<PlacePhoto[]> {
  const res = await fetch(`${PLACES}/places/${encodeURIComponent(placeId)}?languageCode=en`, {
    headers: { 'X-Goog-Api-Key': key(), 'X-Goog-FieldMask': 'photos' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Places detail failed (${res.status})`);
  return mapPhotos((await res.json()).photos);
}

/**
 * Resolve a photo handle to a URL we can stream. `skipHttpRedirect` gives us
 * the URI as JSON instead of a 302, which is easier to proxy and cache.
 */
export async function getPhotoUri(photoName: string, maxWidthPx = 1600): Promise<string | null> {
  const res = await fetch(
    `${PLACES}/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true&key=${key()}`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    // Surface Google's own reason — a blocked key and an expired handle look
    // identical from the outside otherwise.
    const detail = await res.text();
    throw new Error(`Places media ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()).photoUri ?? null;
}

/** The src our pages use — the proxy keeps the API key server-side. */
export function placePhotoSrc(photoName: string, width = 1600) {
  return `/api/place-photo?name=${encodeURIComponent(photoName)}&w=${width}`;
}
