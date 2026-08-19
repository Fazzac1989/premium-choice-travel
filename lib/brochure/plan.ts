import type { TripSource } from './compose';
import type { BrochureKind, DetailLevel, LayoutVariant, PageType } from './schema';

/**
 * Deciding what a brochure contains and in what order.
 *
 * Kept free of database access and of `server-only` so the running order can be
 * reasoned about, tested and generated from a script without standing up the
 * whole app. Reading the trips is build.ts's job; writing the copy is the
 * composer's. Nothing here invents content — it only arranges it.
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

  const pages: PlannedPage[] = [{ pageType: 'cover' }, { pageType: 'brandIntroduction' }];

  // Contents earn their place once a reader can no longer hold the shape of the
  // brochure in their head. Below that they are a page of nothing.
  if (trips.length > 2) pages.push({ pageType: 'contents' });

  // A short bespoke proposal does not need the full corporate front matter.
  if (trips.length > 4) pages.push({ pageType: 'howItWorks' });

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

const blank = (): PlannedPage => ({ pageType: 'textEditorial', content: { blank: true } });

/**
 * Make the running order fall correctly across spreads.
 *
 * On desktop the cover stands alone and everything after it pairs up, so page 1
 * is a leaf by itself and pages 2–3, 4–5 and so on are spreads. That means the
 * odd-numbered pages are left-hand pages.
 *
 * A trip is supposed to read as a spread — the photograph on the left, the
 * story facing it — and a divider is supposed to be the last thing you see
 * before you turn into that trip. Neither happens by luck: without this pass a
 * trip hero lands opposite the previous trip's gallery about half the time.
 * Inserting a blank leaf costs one page and fixes the whole book.
 */
export function alignSpreads(pages: PlannedPage[]): PlannedPage[] {
  const out: PlannedPage[] = [];

  for (const page of pages) {
    // Index within `out` is 0-based; page numbers are 1-based, so a left-hand
    // page sits at an odd index.
    const isLeftNext = out.length % 2 === 1;

    if (page.pageType === 'tripHero' && !isLeftNext) out.push(blank());
    // A divider wants the right-hand side, so it is the page you turn away from.
    if (
      (page.pageType === 'subjectDivider' || page.pageType === 'destinationDivider') &&
      isLeftNext
    ) {
      out.push(blank());
    }

    out.push(page);
  }

  return out;
}

/**
 * A flipbook shows two pages at a time on desktop, so an odd count leaves the
 * back cover stranded on the left. Pad with a blank leaf rather than letting
 * the last spread break.
 */
export function padToSpread(pages: PlannedPage[]): PlannedPage[] {
  const aligned = alignSpreads(pages);
  return aligned.length % 2 === 0
    ? aligned
    : [...aligned.slice(0, -1), blank(), aligned[aligned.length - 1]];
}
