'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';

/** Small School Trips admin operations: appointments, booking terms, media. */

export type MiscResult = { ok: true } | { ok: false; error: string };

const NOT_CONFIGURED = { ok: false, error: 'School Trips database is not configured.' } as const;

export async function setStAppointmentStatus(
  id: number,
  status: 'new' | 'contacted' | 'closed'
): Promise<MiscResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const { error } = await pcstClient().from('appointment_requests').update({ status }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/school-trips/requests');
  return { ok: true };
}

/** Booking terms render on every trip page, so all of them have to rebuild. */
export async function saveStBookingTerms(texts: string[]): Promise<MiscResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const db = pcstClient();
  const { error: delErr } = await db.from('booking_terms').delete().gte('id', 0);
  if (delErr) return { ok: false, error: delErr.message };

  if (texts.length) {
    const { error } = await db
      .from('booking_terms')
      .insert(texts.map((text, i) => ({ sort_order: i + 1, text })));
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/admin/school-trips/terms');
  // One ping rebuilds the index; individual trip pages pick the terms up as
  // they regenerate.
  await revalidatePcst();
  return { ok: true };
}

export async function deleteStMediaObject(path: string): Promise<MiscResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;

  const { error } = await pcstClient().storage.from('trip-images').remove([path]);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/school-trips/media');
  return { ok: true };
}
