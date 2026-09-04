/**
 * A record of the availability requests sent from this device, so the app's
 * Enquiries tab has something to show without an account. The real enquiry
 * lives in Supabase; this is the customer's own copy of what they asked.
 */
const KEY = 'pcs.enquiries';
const EVENT = 'pcs:enquiries';
const LIMIT = 50;

export type LocalEnquiry = {
  id: string;
  hotelName: string;
  hotelHref: string;
  checkIn: string;
  nights: number;
  adults: number;
  childrenAges: string;
  mealPlan: string;
  channel: string;
  sentAt: string;
};

export function readLocalEnquiries(): LocalEnquiry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addLocalEnquiry(entry: Omit<LocalEnquiry, 'id' | 'sentAt'>) {
  if (typeof window === 'undefined') return;
  const record: LocalEnquiry = {
    ...entry,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    sentAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify([record, ...readLocalEnquiries()].slice(0, LIMIT)));
  } catch {
    // Nothing to do — the enquiry itself was already sent.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function subscribeLocalEnquiries(cb: () => void) {
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
