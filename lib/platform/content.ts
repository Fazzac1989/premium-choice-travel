import 'server-only';
import { platform, platformConfigured } from '@/lib/platform/client';

/**
 * A hotel's own content from the trade platform (founder, 2026-10-03: switch Google photos off
 * to save cost): its photographs, description, address and times, as the platform's catalogue
 * holds them from the supplier's content import. The photographs are the supplier's own image
 * library, free to show — no per-view charge and no copy to refresh. Read at most once a day per
 * hotel; reference content, never a price.
 */
export type HotelContent = {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  starRating: number | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  images: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
};

const DAY = 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a hotel's supplier code is a platform hotel id. */
export function isPlatformHotelId(code: string | null | undefined): code is string {
  return Boolean(code && UUID.test(code));
}

export async function hotelContent(platformHotelId: string): Promise<HotelContent | null> {
  if (!platformConfigured() || !isPlatformHotelId(platformHotelId)) return null;
  try {
    return await platform<HotelContent>('GET', `/v1/hotels/${platformHotelId}/content`, undefined, {
      timeoutMs: 8_000,
      revalidateSeconds: DAY,
    });
  } catch (e: any) {
    console.warn('[hotel content]', platformHotelId, e?.message);
    return null;
  }
}

/** Content for many hotels at once, by platform id; a hotel that cannot be read is left out. */
export async function hotelContents(ids: string[]): Promise<Map<string, HotelContent>> {
  const unique = Array.from(new Set(ids.filter(isPlatformHotelId)));
  const out = new Map<string, HotelContent>();
  // a few at a time: the first visit of the day reads them all, every later one is cached
  for (let i = 0; i < unique.length; i += 10) {
    const batch = await Promise.all(unique.slice(i, i + 10).map((id) => hotelContent(id)));
    for (const c of batch) if (c) out.set(c.id, c);
  }
  return out;
}
