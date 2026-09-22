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
