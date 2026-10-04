import type { GolfBrief } from '@/lib/golf/briefs';
import { tripTypeLabel, type GolfTripTypeKey } from '@/lib/golf/catalogue';

/**
 * How a sourcing brief becomes a DRAFT golf journey in the admin.
 *
 * Only what the brief actually says goes in: the hotel candidate, courses to
 * request, nights, rounds and board. There is no price, no itinerary and no
 * invented copy — the overview says plainly that it is a brief. Everything a
 * product manager needs to source it sits in the review note, and the brief
 * itself is kept in `details.brief` so the import can recognise its own rows.
 */

/** Destination slug from the brief's "Country / area" label. */
const COUNTRY_SLUGS: Record<string, string> = {
  UAE: 'united-arab-emirates',
  Oman: 'oman',
  Türkiye: 'turkey',
  Mauritius: 'mauritius',
  Thailand: 'thailand',
  Vietnam: 'vietnam',
  Spain: 'spain',
  Portugal: 'portugal',
  Greece: 'greece',
  Cyprus: 'cyprus',
  Morocco: 'morocco',
  'South Africa': 'south-africa',
  Scotland: 'scotland',
  Ireland: 'ireland',
  'Northern Ireland': 'united-kingdom',
  Indonesia: 'indonesia',
  Cambodia: 'cambodia',
  Malaysia: 'malaysia',
  USA: 'united-states',
  'Dominican Republic': 'dominican-republic',
  Italy: 'italy',
};

/** The golf site's own country key, where it is finer than the destination row. */
const GOLF_COUNTRY: Record<string, string> = { 'Northern Ireland': 'northern-ireland', Indonesia: 'indonesia' };

/** Trip type per brief, chosen by hand from the brief's own structure. */
const TRIP_TYPE: Record<string, GolfTripTypeKey> = {
  P01: 'resort', P02: 'championship', P03: 'championship', P04: 'championship',
  P05: 'all-inclusive', P06: 'all-inclusive', P07: 'beach', P08: 'beach',
  P09: 'beach', P10: 'resort', P11: 'culture', P12: 'resort',
  P13: 'resort', P14: 'resort', P15: 'resort', P16: 'resort',
  P17: 'resort', P18: 'culture', P19: 'all-inclusive', P20: 'resort',
  P21: 'touring', P22: 'resort', P23: 'links', P24: 'touring',
  P25: 'beach', P26: 'resort', P27: 'touring', P28: 'culture',
  P29: 'city', P30: 'city', P31: 'links', P32: 'links',
  P33: 'resort', P34: 'touring', P35: 'resort', P36: 'beach',
  P37: 'city', P38: 'championship', P39: 'beach', P40: 'championship',
};

/**
 * The live journey a brief refines or sits beside, from the workbook's
 * "Existing journeys" sheet. Named in the review note so nobody builds a
 * duplicate resort page by accident.
 */
export const RELATES_TO: Record<string, string> = {
  P02: 'abu-dhabi-championship-escape',
  P03: 'muscat-al-mouj-golf-break',
  P04: 'dubai-championship-collection',
  P05: 'belek-golf-week',
  P07: 'mauritius-golf-and-beach',
  P08: 'mauritius-golf-south-west',
  P09: 'phuket-golf-and-beach',
  P10: 'hua-hin-golf-escape',
  P11: 'da-nang-golf-week',
  P12: 'costa-del-sol-championship-golf',
  P14: 'algarve-golf-escape',
  P16: 'costa-navarino-golf-week',
  P17: 'cyprus-aphrodite-hills-golf',
  P18: 'marrakech-golf-and-culture',
  P20: 'fancourt-garden-route-golf',
  P21: 'cape-town-winelands-golf',
  P22: 'scotland-links-classic',
  P23: 'ireland-southwest-links',
  P24: 'dubai-championship-collection',
  P25: 'mauritius-golf-south-west',
  P26: 'ras-al-khaimah-golf-weekend',
  P31: 'scottish-highlands-links',
  P32: 'northern-ireland-links',
  P33: 'madeira-golf-escape',
  P34: 'florida-players-golf-journey',
  P36: 'dominican-republic-caribbean-golf',
  P37: 'rome-ryder-cup-golf-break',
  P38: 'muscat-al-mouj-golf-break',
  P39: 'phuket-golf-and-beach',
  P40: 'dubai-championship-collection',
};

export const briefSlug = (b: GolfBrief) =>
  b.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const briefCountry = (b: GolfBrief) => b.destination.split('/')[0].trim();

export function briefDestinationSlug(b: GolfBrief): string | null {
  return COUNTRY_SLUGS[briefCountry(b)] ?? null;
}

export function briefReviewNote(b: GolfBrief): string {
  const relates = RELATES_TO[b.id];
  return [
    `SOURCING BRIEF ${b.id} · Priority ${b.priority} · ${b.action} · ${b.status}`,
    'Proposed combination from the 3 Oct 2026 golf audit — not confirmed inventory or price. Do not publish until sourced.',
    '',
    `Before publishing: ${b.before}`,
    `Package structure: ${b.structure}`,
    `Hotel candidate: ${b.hotel}`,
    `Courses to request: ${b.courses}`,
    `Board: ${b.board}`,
    `Customer: ${b.customer}`,
    relates ? `Relates to live journey: /journeys/${relates}` : '',
    b.research.length ? `Research: ${b.research.join(' ')}` : '',
  ]
    .filter((l, i) => l !== '' || i === 2)
    .join('\n');
}

/** "Al Hamra x2; Yas Links x1" → one course entry each, with the rounds wanted. */
export function briefCourses(b: GolfBrief): { heading: string; body: string }[] {
  return b.courses
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const m = /^(.*?)\s+x(\d+)(.*)$/i.exec(c);
      if (m) {
        const n = Number(m[2]);
        return { heading: m[1].trim() + m[3], body: `${n} round${n === 1 ? '' : 's'} to request.` };
      }
      return { heading: c, body: 'To request and confirm with the club.' };
    });
}

/** The packages row for a brief. Always a draft, always "price on request". */
export function briefRow(b: GolfBrief, destinationId: number | null) {
  const country = briefCountry(b);
  return {
    slug: briefSlug(b),
    title: b.title,
    tagline: b.structure,
    brand: 'golf',
    destination_id: destinationId,
    category: tripTypeLabel(TRIP_TYPE[b.id] ?? 'resort'),
    nights: b.nights,
    days: b.nights + 1,
    currency: 'AED',
    overview: [
      `Sourcing brief ${b.id}: ${b.nights} nights and ${b.rounds} rounds based at ${b.hotel}, for ${b.customer.toLowerCase()}. ${b.structure}`,
    ],
    highlights: [],
    includes: [],
    excludes: [],
    itinerary: [],
    hotel_name: b.hotel,
    board_basis: b.board,
    featured: false,
    status: 'draft' as const,
    tags: ['golf'],
    who_for: [b.customer],
    why_works: [],
    seasonal_notes: '',
    extensions: [],
    details: {
      rounds: b.rounds,
      courses: briefCourses(b),
      teeTimeStatus: 'unknown',
      ...(GOLF_COUNTRY[country] ? { countrySlug: GOLF_COUNTRY[country] } : {}),
      brief: {
        id: b.id,
        priority: b.priority,
        action: b.action,
        sourcingStatus: b.status,
        beforePublishing: b.before,
        research: b.research,
        relatesTo: RELATES_TO[b.id] ?? null,
      },
    },
    price_status: 'on_request' as const,
    review_note: briefReviewNote(b),
  };
}
