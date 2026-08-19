import 'server-only';

/**
 * Candidate photography from Wikimedia Commons.
 *
 * Commons is used because it needs no API key and every file carries its
 * licence and author, which the rights metadata requires. Only freely
 * licensed, commercially usable files are returned — nothing is scraped from
 * image search, competitors, operators, schools or social media.
 */

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'PremiumChoiceTravel/1.0 (info@premiumchoicetravel.com)' };

/** CC0, public domain, CC BY and CC BY-SA are fine; NC and ND are not. */
const FREE_LICENCE = /^(cc0|cc[- ]by([- ]sa)?([- ]\d(\.\d)?)?|public domain|pdm)/i;
const BLOCKED = /(nc|nd|fair use|non[- ]free)/i;

/**
 * Paintings, engravings, maps and diagrams match destination searches and look
 * badly out of place next to photography — an 1863 oil painting once became an
 * Australia hero this way.
 */
const ARTWORK =
  /(painting|oil on canvas|watercolou?r|engraving|lithograph|etching|drawing|sketch|illustration|woodcut|fresco|portrait of|map of|diagram|chart|coat of arms|postage stamp|banknote)/i;

export type Candidate = {
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  ratio: number;
  mime: string;
  licence: string | null;
  photographer: string | null;
  description: string | null;
  sourceUrl: string;
};

const strip = (s: unknown) =>
  s ? String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : null;

export type SearchOptions = {
  /** Minimum width in pixels. Heroes want more than gallery images. */
  minWidth?: number;
  /** Keep only landscape-ish images (heroes) or allow any (gallery). */
  landscapeOnly?: boolean;
  limit?: number;
};

export async function searchCommons(
  query: string,
  { minWidth = 1600, landscapeOnly = false, limit = 24 }: SearchOptions = {}
): Promise<Candidate[]> {
  const url =
    `${API}?action=query&format=json&origin=*&generator=search` +
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}` +
    `&gsrnamespace=6&gsrlimit=${limit}` +
    `&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=1200`;

  let json: any;
  try {
    const res = await fetch(url, { headers: UA, next: { revalidate: 3600 } });
    json = await res.json();
  } catch {
    return [];
  }

  const pages: any[] = Object.values(json?.query?.pages ?? {});
  return pages
    .map((p): Candidate | null => {
      const ii = p.imageinfo?.[0];
      if (!ii?.url || !ii.width) return null;
      const meta = ii.extmetadata ?? {};
      const licence = strip(meta.LicenseShortName?.value);
      return {
        title: String(p.title).replace(/^File:/, ''),
        url: ii.url,
        previewUrl: ii.thumburl ?? ii.url,
        width: ii.width,
        height: ii.height,
        ratio: ii.width / ii.height,
        mime: ii.mime,
        licence,
        photographer: strip(meta.Artist?.value),
        description: strip(meta.ImageDescription?.value)?.slice(0, 180) ?? null,
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
      };
    })
    .filter((c): c is Candidate => {
      if (!c) return false;
      if (c.mime === 'image/svg+xml') return false;
      if (c.width < minWidth) return false;
      if (!c.licence || !FREE_LICENCE.test(c.licence) || BLOCKED.test(c.licence)) return false;
      if (ARTWORK.test(c.title) || (c.description && ARTWORK.test(c.description))) return false;
      // Reject extreme panoramas and very tall images: they crop badly.
      if (c.ratio > 3 || c.ratio < 0.5) return false;
      if (landscapeOnly && c.ratio < 1.2) return false;
      return true;
    })
    .sort((a, b) => b.width - a.width);
}

/**
 * The seven roles a trip page needs, turned into searches shaped by the trip's
 * own subject and destination rather than generic travel terms.
 *
 * The gallery deliberately covers food, walking, adventure and culture: a page
 * of six skyline shots reads as a brochure, and those four are what makes a
 * destination feel like somewhere a class would actually go.
 *
 * Queries are kept to two or three words on purpose. Commons ANDs every term,
 * so a descriptive phrase like "Kyoto landmark skyline" matches nothing at all
 * while "Kyoto landmark" returns a full page. Measured across six destinations,
 * this set returns 110+ usable candidates each with no empty role.
 */
export function queriesForTrip(trip: {
  title: string;
  subject: string | null;
  country: string | null;
  city: string | null;
}): { role: string; label: string; query: string; landscapeOnly: boolean }[] {
  const place = trip.city?.split(/[·,/]/)[0]?.trim() || trip.country || trip.title;
  const country = trip.country ?? place;
  const subject = (trip.subject ?? '').toLowerCase();

  const educational =
    subject.includes('history') ? `${place} museum`
    : subject.includes('geograph') ? `${country} landscape`
    : subject.includes('science') ? `${place} science museum`
    : subject.includes('art') ? `${place} architecture`
    : subject.includes('business') || subject.includes('econom') ? `${place} skyline`
    : subject.includes('language') || subject.includes('spanish') || subject.includes('french') ? `${place} old town`
    : subject.includes('sport') ? `${place} stadium`
    : subject.includes('music') || subject.includes('drama') ? `${place} theatre`
    : `${place} museum`;

  return [
    { role: 'hero', label: 'Hero — the trip at a glance', query: `${place} skyline`, landscapeOnly: true },
    { role: 'gallery', label: 'Iconic destination', query: `${place} landmark`, landscapeOnly: false },
    { role: 'gallery', label: 'Educational experience', query: educational, landscapeOnly: false },
    { role: 'gallery', label: 'Food & local cuisine', query: `${country} cuisine`, landscapeOnly: false },
    { role: 'gallery', label: 'Walking & exploring', query: `${place} street`, landscapeOnly: false },
    { role: 'gallery', label: 'Culture & local life', query: `${place} market`, landscapeOnly: false },
    { role: 'gallery', label: 'Adventure & landscape', query: `${country} landscape`, landscapeOnly: false },
  ];
}

/**
 * Progressively broader versions of a query.
 *
 * A tight phrase like "Bushwalking Blue Mountains Three Sisters" returns
 * nothing on Commons, while dropping a word at a time finds the picture. Used
 * when the first search comes back empty.
 */
export function queryVariants(query: string): string[] {
  const words = query.split(/\s+/).filter(Boolean);
  const variants = [query];
  for (let keep = words.length - 1; keep >= 2; keep--) {
    variants.push(words.slice(0, keep).join(' '));
  }
  return variants.filter((v, i) => variants.indexOf(v) === i);
}

/** Search, broadening the phrase until something suitable comes back. */
export async function searchCommonsBroadening(
  query: string,
  options: SearchOptions = {}
): Promise<{ candidates: Candidate[]; usedQuery: string }> {
  for (const variant of queryVariants(query)) {
    const candidates = await searchCommons(variant, options);
    if (candidates.length) return { candidates, usedQuery: variant };
  }
  return { candidates: [], usedQuery: query };
}
