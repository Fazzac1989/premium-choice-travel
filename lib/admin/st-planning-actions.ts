'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { DOCS_BUCKET } from '@/lib/st-portal';

/**
 * Planning workspaces for the School Trips teacher portal — the shared place a
 * school fills in its student list, passports, consent forms, rooming and
 * dietary or medical details.
 *
 * The portal pages that read this are session-gated and therefore rendered per
 * request, so nothing here needs to ask the School Trips site to rebuild.
 */

export type PlanningResult = { ok: true; id?: number } | { ok: false; error: string };

const NOT_CONFIGURED = { ok: false, error: 'School Trips database is not configured.' } as const;

/** Open a planning workspace, optionally seeded from an accepted quote. */
export async function createStPortalTrip(input: {
  quoteId: number | null;
  title: string;
  schoolName: string;
  travelDates: string;
  departureDate: string | null;
  paperworkDue: string | null;
  teacherIds: number[];
}): Promise<PlanningResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  if (!input.title.trim() || !input.schoolName.trim()) {
    return { ok: false, error: 'Title and school are both required.' };
  }

  const db = pcstClient();
  const { data, error } = await db
    .from('portal_trips')
    .insert({
      quote_id: input.quoteId,
      title: input.title.trim(),
      school_name: input.schoolName.trim(),
      travel_dates: input.travelDates.trim() || null,
      departure_date: input.departureDate || null,
      paperwork_due: input.paperworkDue || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  if (input.teacherIds.length) {
    const { error: linkErr } = await db
      .from('portal_trip_teachers')
      .insert(input.teacherIds.map((teacher_id) => ({ portal_trip_id: data.id, teacher_id })));
    if (linkErr) return { ok: false, error: linkErr.message };
  }

  revalidatePath('/admin/school-trips/planning');
  return { ok: true, id: data.id };
}

export async function setStTripTeachers(
  tripId: number,
  teacherIds: number[]
): Promise<PlanningResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  await db.from('portal_trip_teachers').delete().eq('portal_trip_id', tripId);
  if (teacherIds.length) {
    const { error } = await db
      .from('portal_trip_teachers')
      .insert(teacherIds.map((teacher_id) => ({ portal_trip_id: tripId, teacher_id })));
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath('/admin/school-trips/planning');
  return { ok: true };
}

export async function setStTripStatus(
  tripId: number,
  status: 'planning' | 'ready' | 'travelling' | 'completed'
): Promise<PlanningResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const { error } = await pcstClient().from('portal_trips').update({ status }).eq('id', tripId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/school-trips/planning');
  return { ok: true };
}

/**
 * Delete every student record and document for a finished trip. Irreversible —
 * this is how passport and medical data stops being held once it is no longer
 * needed. The trip itself remains, marked as purged.
 */
export async function purgeStTripData(tripId: number): Promise<PlanningResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();

  // Remove the documents first, so nothing is orphaned in storage.
  const { data: files } = await db.storage.from(DOCS_BUCKET).list(`trip-${tripId}`, { limit: 1000 });
  for (const folder of files ?? []) {
    const { data: inner } = await db.storage
      .from(DOCS_BUCKET)
      .list(`trip-${tripId}/${folder.name}`, { limit: 1000 });
    const paths = (inner ?? []).map((f) => `trip-${tripId}/${folder.name}/${f.name}`);
    if (paths.length) await db.storage.from(DOCS_BUCKET).remove(paths);
  }

  const { error: delErr } = await db.from('portal_students').delete().eq('portal_trip_id', tripId);
  if (delErr) return { ok: false, error: delErr.message };

  const { error } = await db
    .from('portal_trips')
    .update({ data_purged_at: new Date().toISOString(), status: 'completed' })
    .eq('id', tripId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/school-trips/planning');
  return { ok: true };
}

export async function deleteStPortalTrip(tripId: number): Promise<PlanningResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const purge = await purgeStTripData(tripId);
  if (!purge.ok) return purge;

  const { error } = await pcstClient().from('portal_trips').delete().eq('id', tripId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/school-trips/planning');
  return { ok: true };
}
