import type { PackageBrochurePage, PageContent } from '@/lib/package-brochure/schema';
import type { BrochurePackage } from '@/lib/package-brochure/data';

/**
 * Gather the pages belonging to one package into a single spread.
 *
 * The block model stores several pages per package — an introduction, the
 * courses, the day-by-day, why this destination. One block to a slide would
 * give a twenty-package brochure eighty slides; one package to a spread gives
 * it twenty, and the slides are built from the spread.
 */

export type PackageSpread = {
  packageId: number;
  pkg: BrochurePackage | undefined;
  content: PageContent;
  images: string[];
};

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Later pages fill gaps rather than overwrite: a courses page carries the
 * course notes and an introduction the proposition, and neither should erase
 * the other.
 */
export function gatherPackages(
  pages: PackageBrochurePage[],
  packages: Record<number, BrochurePackage>,
): PackageSpread[] {
  const order: number[] = [];
  const byPackage = new Map<number, PackageSpread>();

  for (const page of pages) {
    if (page.packageId === null) continue;
    if (!byPackage.has(page.packageId)) {
      order.push(page.packageId);
      byPackage.set(page.packageId, {
        packageId: page.packageId,
        pkg: packages[page.packageId],
        content: {},
        images: [],
      });
    }
    const spread = byPackage.get(page.packageId)!;
    const c = page.content ?? {};

    for (const [key, value] of Object.entries(c)) {
      if (key === 'imageUrls') continue;
      if (isEmpty(value)) continue;
      if ((spread.content as any)[key] === undefined) (spread.content as any)[key] = value;
    }
    for (const url of c.imageUrls ?? []) {
      if (url && !spread.images.includes(url)) spread.images.push(url);
    }
  }

  return order.map((id) => byPackage.get(id)!);
}

export type PackageGroup = { label: string; spreads: PackageSpread[] };

/** Sorted the way a reader scans a list: A before B, and numbers before words. */
const byName = (a: string, b: string) =>
  a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true });

/**
 * The order the collection reads in: region by region, and inside each one the
 * destinations alphabetically.
 *
 * The contents and the package pages are driven by the same array, so ordering
 * it once orders both. That matters on paper: a printed contents that lists the
 * packages in one order while the sheets run in another is worse than none.
 * Packages sharing a destination keep their titles in alphabetical order too,
 * so the four Scottish trips do not shuffle between renders.
 *
 * Regions are taken from the destination records rather than a fixed list, so a
 * new region appears without anyone editing code. Europe leads because that is
 * where most golf travel from the Gulf goes; the rest follow alphabetically.
 */
const REGION_LEAD = ['Europe', 'Middle East'];

export function orderByRegion(spreads: PackageSpread[]): PackageSpread[] {
  const regions = Array.from(
    new Set(spreads.map((s) => s.pkg?.region?.trim()).filter(Boolean) as string[]),
  );
  const rest = regions.filter((r) => !REGION_LEAD.includes(r)).sort(byName);
  const order = [...REGION_LEAD.filter((r) => regions.includes(r)), ...rest];

  const rank = (s: PackageSpread) => {
    const r = s.pkg?.region?.trim();
    const i = r ? order.indexOf(r) : -1;
    // A package whose region is unknown sits at the end rather than the front.
    return i === -1 ? order.length : i;
  };

  return [...spreads].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    const dest = byName((a.pkg?.destination ?? '').trim(), (b.pkg?.destination ?? '').trim());
    if (dest !== 0) return dest;
    return byName(a.pkg?.title ?? '', b.pkg?.title ?? '');
  });
}

/**
 * Group the contents by region, or by destination when a brochure is built
 * around one place.
 *
 * Packages with nothing to group by are collected under one honest heading
 * rather than each becoming a heading of its own.
 */
export function groupSpreads(
  spreads: PackageSpread[],
  by: 'region' | 'destination' = 'region',
): PackageGroup[] {
  const order: string[] = [];
  const groups = new Map<string, PackageSpread[]>();
  const OTHER = 'More journeys';

  for (const s of spreads) {
    const raw = by === 'destination' ? s.pkg?.destination : s.pkg?.region;
    const label = (raw ?? '').trim() || OTHER;
    if (!groups.has(label)) {
      order.push(label);
      groups.set(label, []);
    }
    groups.get(label)!.push(s);
  }

  // A single group is not a grouping; the contents reads better as a plain list.
  if (order.length <= 1) return [{ label: '', spreads }];

  const named = order.filter((l) => l !== OTHER);
  const tail = order.includes(OTHER) ? [OTHER] : [];
  return [...named, ...tail].map((label) => ({ label, spreads: groups.get(label)! }));
}

/**
 * A brochure-sized introduction, cut at a sentence.
 *
 * A package's own overview is written for a web page with room to scroll — one
 * of them runs to twenty lines, which is more than a slide holds. Cutting to a
 * character count would end mid-thought, so this keeps whole sentences and
 * stops once it has enough.
 */
export function introSummary(paragraphs: string[], maxChars = 380): string {
  const t = (paragraphs[0] ?? '').trim();
  if (!t || t.length <= maxChars) return t;

  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [t];
  let out = '';
  for (const s of sentences) {
    if (out && (out + s).trim().length > maxChars) break;
    out += s;
  }
  // A single sentence longer than the budget is kept whole rather than cut:
  // half a sentence in a brochure reads as a mistake.
  return (out.trim() || sentences[0] || t).trim();
}

/** Whether a package's courses page has anything on it. */
export const hasCoursesPage = (p: BrochurePackage | undefined) => Boolean(p && p.courses.length > 0);

/** Whether a package's "why this destination" page has anything on it. */
export const hasWhyPage = (p: BrochurePackage | undefined) =>
  Boolean(p && (p.whyWorks.length > 0 || p.whoFor.length > 0));

/* ─────────────────────────── the contents page ─────────────────────────── */

/**
 * What the contents costs, in printed pixels at A4 landscape.
 *
 * Measured in the print layout on the School Trips deck, which this one
 * inherits: the thumbnail fixes an entry at 81.2px whatever its title does, and
 * a group heading with the margin under its section costs 48.8px. The two
 * columns hold 1155px; the capacity below keeps a little of that back.
 */
const ENTRY_COST = 82;
const GROUP_COST = 49;
export const CONTENTS_CAPACITY = 1120;

/**
 * Break the contents into pages that each fit one sheet.
 *
 * Groups are kept whole where they fit, and a group too long for what is left
 * is split, repeating its heading so a reader arriving mid-list still knows
 * which region they are in.
 */
export function paginateContents(groups: PackageGroup[], capacity = CONTENTS_CAPACITY): PackageGroup[][] {
  const pages: PackageGroup[][] = [];
  let page: PackageGroup[] = [];
  let used = 0;

  for (const group of groups) {
    let rest = group.spreads;
    while (rest.length) {
      const overhead = group.label ? GROUP_COST : 0;
      const room = capacity - used - overhead;
      let take = Math.max(0, Math.floor(room / ENTRY_COST));

      if (take === 0) {
        if (page.length) {
          pages.push(page);
          page = [];
          used = 0;
          continue;
        }
        // An empty page that still cannot hold one entry would loop for ever.
        take = 1;
      }

      const n = Math.min(take, rest.length);
      page.push({ label: group.label, spreads: rest.slice(0, n) });
      used += overhead + n * ENTRY_COST;
      rest = rest.slice(n);

      if (rest.length) {
        pages.push(page);
        page = [];
        used = 0;
      }
    }
  }

  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}
