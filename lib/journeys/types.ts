/**
 * A journey as authored in the product library (lib/journeys/*.ts).
 * scripts/seed-journeys.ts upserts these into the packages table by slug;
 * images come from lib/generated/journey-images.json keyed by slug.
 */
export type JourneyStage = {
  /** e.g. "Days 1–3" or "Day 4" */
  label: string;
  /** e.g. "Tokyo — neighbourhoods, food and modern Japan" */
  title: string;
  /** Narrative incl. suggested experiences, transport to next stage, accommodation style. */
  description: string;
};

export type JourneySeed = {
  slug: string;
  title: string;
  /** Short card description — one sentence, no clichés. */
  tagline: string;
  brand: 'holidays' | 'staycations' | 'cruises' | 'golf';
  /** Must match a destination catalogue slug. */
  destinationSlug: string;
  /** Journey type shown on cards, e.g. "Multi-centre", "Family beach", "River cruise". */
  category: string;
  nights: number;
  days: number;
  /** Full introduction, 2–3 paragraphs. */
  overview: string[];
  /** 4–6 highlights. */
  highlights: string[];
  includes: string[];
  excludes: string[];
  itinerary: JourneyStage[];
  /** Accommodation style / suggested property positioning (never claim contracted). */
  hotelName?: string;
  boardBasis?: string;
  /** AI Inspiration tags, lowercase kebab, e.g. family, winter-sun, short-haul. */
  tags: string[];
  /** Who it suits — 2–4 bullets. */
  whoFor: string[];
  /** Why this journey works — 2–4 bullets. */
  whyWorks: string[];
  seasonalNotes: string;
  /** Suggested extensions — short phrases. */
  extensions: string[];
  seoTitle: string;
  seoDescription: string;
  /** Brand-specific structured details (golf/cruise/staycation) — stored in packages.details. */
  details?: Record<string, unknown>;
  /**
   * Publication safety: 'review' = READY FOR REVIEW (editorial verified);
   * 'draft' = DRAFT — COMMERCIAL REVIEW REQUIRED (set reviewNote).
   * Existing published records keep their published status on upsert.
   */
  status: 'review' | 'draft';
  reviewNote?: string;
  /** Unsplash search queries for the image-sourcing script, hero first. */
  imageQueries: string[];
};
