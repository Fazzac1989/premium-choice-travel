import 'server-only';
import { pcstClient } from '@/lib/pcst';
import type { TripRecord } from './plan';

/**
 * Reading everything a trip holds into the shape the brochure needs.
 *
 * Page planning lives in plan.ts, deliberately free of database access, so the
 * running order can be generated and reasoned about without the app around it.
 */

export type { TripRecord, TripWarning, PlannedPage, PlanInput } from './plan';
export { checkTrips, planPages, padToSpread } from './plan';

const TRIP_SELECT = `
  id, slug, title, status, city, duration_days, duration_nights, overview, includes,
  journey, trip_highlights, subject_id, country_id, hero_image, gallery,
  subjects(name), countries(name),
  itinerary_days(sort_order, label, title, description, display_title, summary,
                 primary_location, highlights, learning_focus, notices)
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

    // The trip's own photography, in the order the admin arranged it.
    const hero: string | null = row.hero_image ?? null;
    const gallery: string[] = Array.isArray(row.gallery)
      ? (row.gallery as any[])
          .map((g) => (typeof g === 'string' ? g : g?.url))
          .filter((u: unknown): u is string => typeof u === 'string')
      : [];

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
      heroImage: hero,
      galleryImages: gallery,
      // Dimensions are no longer stored alongside the URL, so a spread takes
      // whatever the trip has; the layout crops to fit.
      landscapeImages: [hero, ...gallery].filter((u): u is string => Boolean(u)),
    });
  }

  // Preserve the admin's running order rather than the database's.
  return tripIds.map((id) => byId.get(id)).filter((t): t is TripRecord => Boolean(t));
}
