/**
 * A brochure built from packages.
 *
 * The School Trips brochure is built from trips and lives in that database;
 * this is the same document built from `packages`, for the brand sites in this
 * codebase. Golf Holidays is the first to use it.
 *
 * Two differences from the School Trips schema, both deliberate. There is no
 * client: a golf brochure is a collection Premium Choice publishes, not a
 * document prepared for one school, so no client name and no crest. And the
 * pages are named for packages rather than trips, because a golf page is an
 * introduction, the courses, the day-by-day and why this destination — not a
 * hero, an overview and a gallery.
 */

export const PAGE_TYPES = [
  'cover',
  'brandIntroduction',
  'contents',
  'textEditorial',
  'destinationDivider',
  'packageIntro',
  'packageCourses',
  'packageItinerary',
  'packageWhy',
  'packageGallery',
  'howItWorks',
  'callToAction',
  'contact',
  'backCover',
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const PAGE_LABELS: Record<PageType, string> = {
  cover: 'Cover',
  brandIntroduction: 'Introduction',
  contents: 'Contents',
  textEditorial: 'Editorial',
  destinationDivider: 'Destination divider',
  packageIntro: 'Introduction',
  packageCourses: 'The courses',
  packageItinerary: 'Day by day',
  packageWhy: 'Why this destination',
  packageGallery: 'Gallery',
  howItWorks: 'How it works',
  callToAction: 'Get started',
  contact: 'Contact',
  backCover: 'Back cover',
};

export type BrochureStatus = 'draft' | 'published' | 'archived';
export type BrochureVisibility = 'public' | 'unlisted';
export type BrochureBrand = 'holidays' | 'staycations' | 'cruises' | 'golf' | 'corporate';

export type BrochureDesign = {
  coverTheme?: 'light' | 'dark';
  /** Every page but the cover: navy throughout, or white. Defaults to light. */
  documentTheme?: 'light' | 'dark';
  /** The day-by-day page after each package. On unless turned off. */
  showItinerary?: boolean;
  /** The courses page. On unless turned off. */
  showCourses?: boolean;
  /** The "Why this destination" page. On unless turned off. */
  showWhy?: boolean;
  /** The "About Premium Choice" introduction. */
  showIntro?: boolean;
  /** How a trip is booked and what happens next. */
  showHowItWorks?: boolean;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
};

/** A highlight as it appears in the brochure: a name and one short line. */
export type BrochureHighlight = { name: string; note: string };

/** One course on the courses page, as the package records it. */
export type CourseNote = { heading: string; body: string };

/** A day on the day-by-day page. */
export type ItineraryDay = { label: string; title: string; description: string };

export type PageContent = {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  /** One line that sells the package. Under about 120 characters. */
  proposition?: string;
  intro?: string;
  body?: string[];
  highlights?: BrochureHighlight[];
  courses?: CourseNote[];
  days?: ItineraryDay[];
  /** What the price covers, and what it does not. */
  inclusions?: string[];
  exclusions?: string[];
  /** Wording lifted from the package that qualifies a promise — "access unverified". */
  conditions?: string[];
  /** Who the trip suits, from the package's own who_for. */
  whoFor?: string[];
  /** Why this destination works, from the package's own why_works. */
  whyWorks?: string[];
  /** Add-ons the package offers. */
  extensions?: string[];
  /** When to go, in the package's own words. */
  seasonalNotes?: string;
  meta?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Chosen from the package's approved imagery only. */
  imageUrls?: string[];
};

export type PackageBrochurePage = {
  id: number;
  pageType: PageType;
  sortOrder: number;
  packageId: number | null;
  content: PageContent;
  hidden: boolean;
};

export type PackageBrochure = {
  id: number;
  slug: string;
  brand: BrochureBrand;
  title: string;
  subtitle: string | null;
  status: BrochureStatus;
  visibility: BrochureVisibility;
  coverImage: string | null;
  introText: string | null;
  closingText: string | null;
  design: BrochureDesign;
  packageIds: number[];
  seoTitle: string | null;
  seoDescription: string | null;
  pdfStoragePath: string | null;
  pdfGeneratedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ─────────────────────────────── mapping ─────────────────────────────── */

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const asObject = <T,>(v: unknown): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : ({} as T));

export function mapBrochure(row: any): PackageBrochure {
  return {
    id: row.id,
    slug: row.slug,
    brand: row.brand ?? 'golf',
    title: row.title,
    subtitle: row.subtitle ?? null,
    status: row.status ?? 'draft',
    visibility: row.visibility ?? 'public',
    coverImage: row.cover_image ?? null,
    introText: row.intro_text ?? null,
    closingText: row.closing_text ?? null,
    design: asObject<BrochureDesign>(row.design),
    packageIds: asArray<number>(row.package_ids),
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    pdfStoragePath: row.pdf_storage_path ?? null,
    pdfGeneratedAt: row.pdf_generated_at ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPage(row: any): PackageBrochurePage {
  return {
    id: row.id,
    pageType: row.page_type,
    sortOrder: row.sort_order ?? 0,
    packageId: row.package_id ?? null,
    content: asObject<PageContent>(row.content),
    hidden: Boolean(row.hidden),
  };
}
