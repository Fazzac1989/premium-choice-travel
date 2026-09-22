import type { BrochurePackage } from '@/lib/package-brochure/data';
import type { PageType } from '@/lib/package-brochure/schema';

/**
 * The pages a brochure gets when it is first built.
 *
 * A package earns a page only when it has something to put on it: no courses
 * recorded means no courses page, rather than a heading over an empty column.
 * The studio can hide or reorder anything afterwards — this is the starting
 * arrangement, not a fixed one.
 */

export type PlannedPage = {
  pageType: PageType;
  packageId: number | null;
  sortOrder: number;
  content: Record<string, unknown>;
};

/** One package's run of pages, in reading order. */
export function pagesForPackage(pkg: BrochurePackage): PageType[] {
  const pages: PageType[] = ['packageIntro'];
  if (pkg.courses.length > 0) pages.push('packageCourses');
  if (pkg.itinerary.length > 0) pages.push('packageItinerary');
  if (pkg.whyWorks.length > 0 || pkg.whoFor.length > 0) pages.push('packageWhy');
  return pages;
}

/**
 * The whole brochure: a cover, a contents, every package in the order given,
 * and a closing page.
 *
 * Nothing is composed here. The pages start empty and the deck falls back to
 * the package's own words, so a brochure is readable the moment it is made and
 * editing is a choice rather than a chore.
 */
export function planPages(packages: BrochurePackage[]): PlannedPage[] {
  const out: PlannedPage[] = [];
  const push = (pageType: PageType, packageId: number | null = null, content: Record<string, unknown> = {}) =>
    out.push({ pageType, packageId, sortOrder: out.length, content });

  push('cover');
  if (packages.length > 0) push('contents');

  for (const pkg of packages) {
    for (const pageType of pagesForPackage(pkg)) push(pageType, pkg.id);
  }

  push('contact');
  return out;
}

/* ─────────────────────────────── ordering ─────────────────────────────── */

/** Just enough of a stored page row to put the deck back in order. */
export type OrderableRow = { id: number; sort_order: number; page_type: string; package_id: number | null };

const IS_CLOSING = (t: string) => t === 'contact' || t === 'callToAction';

/** The journeys a set of rows contains, in the order they first appear. */
export function packageOrderOf(rows: OrderableRow[]): number[] {
  const order: number[] = [];
  for (const r of rows) if (r.package_id && !order.includes(r.package_id)) order.push(r.package_id);
  return order;
}

/**
 * Lay the pages out for a given order of journeys.
 *
 * Three bands, and they must not mix: the cover and contents lead, the
 * journeys run in the middle, and the closing page is last. Sorting the rows
 * as one list would let "talk to us" drift into the middle of the collection
 * the first time a journey moved past it.
 *
 * A journey keeps its own pages in the order they were stored, because a
 * reader meets it as an introduction, its courses, its days and its why page.
 */
export function reorderPages(rows: OrderableRow[], packageOrder: number[]): OrderableRow[] {
  const head = rows.filter((r) => !r.package_id && !IS_CLOSING(r.page_type));
  const tail = rows.filter((r) => !r.package_id && IS_CLOSING(r.page_type));
  const body = packageOrder.flatMap((p) => rows.filter((r) => r.package_id === p));
  // Anything belonging to a journey the caller did not name still travels with
  // the deck rather than being dropped on the floor.
  const named = new Set(packageOrder);
  const orphans = rows.filter((r) => r.package_id && !named.has(r.package_id));
  return [...head, ...body, ...orphans, ...tail];
}

/** Move one journey up or down. Returns the new order, unchanged at the ends. */
export function movePackageInOrder(order: number[], packageId: number, direction: -1 | 1): number[] {
  const at = order.indexOf(packageId);
  const to = at + direction;
  if (at < 0 || to < 0 || to >= order.length) return order;
  const next = [...order];
  [next[at], next[to]] = [next[to], next[at]];
  return next;
}

/** What the studio should warn about before a brochure goes out. */
export type PackageWarning = { packageId: number; title: string; issues: string[] };

export function checkPackages(packages: BrochurePackage[]): PackageWarning[] {
  const warnings: PackageWarning[] = [];
  for (const p of packages) {
    const issues: string[] = [];
    if (!p.heroImage && p.images.length === 0) issues.push('no photography');
    if (p.overview.length === 0) issues.push('no introduction written');
    if (p.highlights.length === 0) issues.push('no highlights');
    if (p.itinerary.length === 0) issues.push('no day-by-day');
    if (p.courses.length === 0) issues.push('no courses recorded');
    if (p.whyWorks.length === 0 && p.whoFor.length === 0) issues.push('nothing for the "why" page');
    if (!p.destination) issues.push('no destination, so it cannot be grouped');
    if (issues.length) warnings.push({ packageId: p.id, title: p.title, issues });
  }
  return warnings;
}
