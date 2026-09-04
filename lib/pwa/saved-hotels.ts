/**
 * Saved hotels live in the browser — no account needed to keep a shortlist.
 * Browser-only: every function guards against a missing window.
 */
const KEY = 'pcs.saved-hotels';
const EVENT = 'pcs:saved-hotels';

export function readSavedHotels(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private mode or a full store — the heart still toggles for this page.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function isHotelSaved(slug: string) {
  return readSavedHotels().includes(slug);
}

/** Toggle and return the new state. Newest saves go first. */
export function toggleSavedHotel(slug: string): boolean {
  const list = readSavedHotels();
  const saved = list.includes(slug);
  write(saved ? list.filter((s) => s !== slug) : [slug, ...list]);
  return !saved;
}

export function subscribeSavedHotels(cb: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', onStorage);
  };
}
