import 'server-only';
import { pcstClient } from '@/lib/pcst';
import type { TripSource } from './compose';
import type { BrochureKind, DetailLevel, LayoutVariant, PageType } from './schema';

/**
 * Turning a selection of trips into a brochure.
 *
 * Two jobs live here: reading everything a trip holds into the shape the copy
 * editor needs, and planning the running order of pages. Neither writes any
 * copy — that is the composer's job — so this stays deterministic and testable.
 */

export type TripRecord = TripSource & {
  id: number;
  slug: string;
  status: string;
  subjectId: number | null;
  countryId: number | null;
  heroImage: string | null;
  galleryImages: string[];
  /** Images good enough to run large. Portrait crops badly across a spread. */
  landscapeImages: string[];
};

const TRIP_SELECT = `
  id, slug, title, status, city, duration_days, duration_nights, overview, includes,
  journey, trip_highlights, subject_id, country_id, hero_image,
  subjects(name), countries(name),
  itinerary_days(sort_order, label, title, description, display_title, summary,
                 primary_location, highlights, learning_focus, notices),
  trip_images(role, url, width, height, sort_order)
`;

export async function loadTripRecords(tripIds: number[]): Promise<TripRecord[]> {
  if (!tripIds.length) return [];

  const { data, error } = await pcstClient().from('trips').select(TRIP_SELECT).in('id', tripIds);
  if (error) throw new Error(error.message);

  const byId = new Map<number, TripRecord>();

  for (const row of (data ?? []) as any[]) {
    const days = ((row.itinerary_days ?? []) as any[])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((d, i) => ({
        dayNumber: i + 1,
        label: d.label ?? null,
        title: d.title ?? '',
        description: d.description ?? '',
        displayTitle: d.display_title ?? null,
        summary: d.summary ?? null,
        primaryLocation: d.primary_location ?? null,
        highlights: ((d.highlights ?? []) as any[]).map((h) => ({
          name: h.name ?? '',
          summary: h.summary ?? '',
          conditional: Boolean(h.conditional),
          conditionalText: h.conditional_text ?? '',
        })),
        learningFocus: (d.learning_focus ?? []) as string[],
        notices: (d.notices ?? []) as string[],
      }));

    const images = ((row.trip_images ?? []) as any[]).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
    const hero = images.find((i) => i.role === 'hero');
    const gallery = images.filter((i) => i.role === 'gallery');

    // A spread runs an image across half a page or wider, so anything taller
    // than it is wide will be cropped unrecognisably.
    const isLandscape = (i: any) => !i.width || !i.height || i.width / i.height >= 1.2;

    byId.set(row.id, {
      id: row.id,
      slug: row.slug,
      status: row.status,
      title: row.title,
      subject: row.subjects?.name ?? null,
      country: row.countries?.name ?? null,
      city: row.city ?? null,
      subjectId: row.subject_id ?? null,
      countryId: row.country_id ?? null,
      durationDays: row.duration_days ?? 0,
      durationNights: row.duration_nights ?? 0,
      overview: (row.overview ?? []) as string[],
      includes: (row.includes ?? []) as string[],
      tripHighlights: (row.trip_highlights ?? []) as string[],
      journey: ((row.journey ?? []) as any[]).map((j) => ({
        location: j.location,
        fromDay: j.from_day,
        toDay: j.to_day,
      })),
      days,
      heroImage: hero?.url ?? row.hero_image ?? null,
      galleryImages: gallery.map((i) => i.url),
      landscapeImages: [hero, ...gallery].filter(Boolean).filter(isLandscape).map((i: any) => i.url),
    });
  }

  // Preserve the admin's running order rather than the database's.
  return tripIds.map((id) => byId.get(id)).filter((t): t is TripRecord => Boolean(t));
}

/* ─────────────────────────── image warnings ─────────────────────────── */

export type TripWarning = { tripId: number; title: string; issues: string[] };

/**
 * Problems worth telling an admin about before they publish. None of these
 * block publishing — a thin brochure is better than no brochure — but a spread
 * built from one portrait photograph looks broken, and that is worth knowing
 * before it reaches a head teacher.
 */
export function checkTrips(trips: TripRecord[], detailLevel: DetailLevel): TripWarning[] {
  const warnings: TripWarning[] = [];

  for (const t of trips) {
    const issues: string[] = [];

    if (!t.heroImage) issues.push('No hero image — the trip spread will have no lead photograph.');
    if (t.landscapeImages.length < 2) {
      issues.push(
        `Only ${t.landscapeImages.length} suitable landscape image${t.landscapeImages.length === 1 ? '' : 's'} available.`
      );
    }
    if (new Set(t.galleryImages).size !== t.galleryImages.length) {
      issues.push('The gallery contains duplicate images.');
    }
    if (!t.overview.length) issues.push('No overview text to condense.');
    if (detailLevel === 'detailed' && !t.days.some((d) => d.summary)) {
      issues.push('No structured itinerary — the journey page will fall back to day titles.');
    }
    if (t.status !== 'published') issues.push(`This trip is a ${t.status}, not published.`);

    if (issues.length) warnings.push({ tripId: t.id, title: t.title, issues });
  }

  return warnings;
}

/* ──────────────────────────── page planning ──────────────────────────── */

export type PlannedPage = {
  pageType: PageType;
  tripId?: number | null;
  subjectId?: number | null;
  countryId?: number | null;
  layoutVariant?: LayoutVariant;
  content?: Record<string, unknown>;
  backgroundImage?: string | null;
};

/**
 * Rotate through the editorial compositions so a long brochure has rhythm.
 * Four trips in a row laid out identically reads as a catalogue, which is
 * exactly what this is not supposed to feel like.
 */
const VARIANTS: LayoutVariant[] = ['a', 'b', 'c', 'd'];
const variantFor = (index: number): LayoutVariant => VARIANTS[index % VARIANTS.length];

/** How many pages a trip earns, by detail level. */
function tripPages(trip: TripRecord, detail: DetailLevel, index: number): PlannedPage[] {
  const variant = variantFor(index);
  const pages: PlannedPage[] = [
    { pageType: 'tripHero', tripId: trip.id, layoutVariant: variant, backgroundImage: trip.heroImage },
    { pageType: 'tripOverview', tripId: trip.id, layoutVariant: variant },
  ];

  if (detail === 'inspiration') return pages;

  if (trip.landscapeImages.length >= 3) {
    pages.push({ pageType: 'tripGallery', tripId: trip.id, layoutVariant: variant });
  }

  if (detail === 'detailed' && trip.days.some((d) => d.summary || d.title)) {
    pages.push({ pageType: 'tripItinerary', tripId: trip.id, layoutVariant: variant });
  }

  return pages;
}

export type PlanInput = {
  kind: BrochureKind;
  detailLevel: DetailLevel;
  trips: TripRecord[];
  design: { showSafety?: boolean; showApp?: boolean; showTerms?: boolean };
  /** Group trips under dividers. Off for a short custom brochure. */
  groupBy: 'subject' | 'country' | 'none';
};

/**
 * Build the running order.
 *
 * The front matter is fixed — a brochure needs a cover and an introduction —
 * but everything after it derives from the content, so a two-trip proposal and
 * a forty-trip master collection both come out sensibly shaped.
 */
export function planPages(input: PlanInput): PlannedPage[] {
  const { trips, detailLevel, design, groupBy } = input;

  const pages: PlannedPage[] = [
    { pageType: 'cover' },
    { pageType: 'brandIntroduction' },
  ];

  // A short bespoke proposal does not need the full corporate front matter.
  if (trips.length > 4) {
    pages.push({ pageType: 'howItWorks' });
  }

  if (groupBy === 'none') {
    trips.forEach((t, i) => pages.push(...tripPages(t, detailLevel, i)));
  } else {
    const key = groupBy === 'subject' ? 'subjectId' : 'countryId';
    const label = groupBy === 'subject' ? 'subject' : 'country';

    // Keep first-appearance order, so the admin's ordering still shows through.
    const groups: { id: number | null; name: string; trips: TripRecord[] }[] = [];
    for (const t of trips) {
      const id = t[key];
      const name = (groupBy === 'subject' ? t.subject : t.country) ?? 'More trips';
      const existing = groups.find((g) => g.id === id);
      if (existing) existing.trips.push(t);
      else groups.push({ id, name, trips: [t] });
    }

    let index = 0;
    for (const group of groups) {
      pages.push({
        pageType: groupBy === 'subject' ? 'subjectDivider' : 'destinationDivider',
        [`${label}Id`]: group.id,
        content: {
          headline: group.name,
          meta: `${group.trips.length} trip${group.trips.length === 1 ? '' : 's'}`,
        },
        backgroundImage: group.trips.find((t) => t.heroImage)?.heroImage ?? null,
      } as PlannedPage);

      for (const t of group.trips) {
        pages.push(...tripPages(t, detailLevel, index));
        index++;
      }
    }
  }

  if (design.showSafety !== false) pages.push({ pageType: 'safety' });
  if (design.showApp !== false) pages.push({ pageType: 'appFeature' });

  pages.push({ pageType: 'callToAction' }, { pageType: 'contact' }, { pageType: 'backCover' });

  return pages;
}

/**
 * A flipbook always shows two pages at a time on desktop, so an odd count
 * leaves the back cover stranded on the left. Pad with a blank editorial page
 * rather than letting the last spread break.
 */
export function padToSpread(pages: PlannedPage[]): PlannedPage[] {
  // Cover and back cover each take a leaf of their own.
  return pages.length % 2 === 0
    ? pages
    : [...pages.slice(0, -1), { pageType: 'textEditorial' as PageType, content: { blank: true } }, pages[pages.length - 1]];
}
