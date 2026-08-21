'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';

/**
 * Website settings for the School Trips public site.
 *
 * Each area is one row in site_settings; the site merges the stored document
 * over its built-in defaults at render time, so a row that has never been
 * saved simply means the site shows its default wording.
 */

export type SiteResult = { ok: true } | { ok: false; error: string };

export async function readStSiteSettings(key: 'site' | 'safety_page'): Promise<unknown> {
  await requireAdmin();
  if (!isPcstConfigured()) return null;
  const { data } = await pcstClient().from('site_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

export async function saveStSiteSettings(
  key: 'site' | 'safety_page',
  value: unknown
): Promise<SiteResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return { ok: false, error: 'School Trips database is not configured.' };

  const { error } = await pcstClient()
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) {
    return {
      ok: false,
      error: error.message.includes('site_settings')
        ? 'Run the 20260822000000_site_settings.sql migration against the School Trips database first.'
        : error.message,
    };
  }

  revalidatePath('/admin/school-trips/website');
  // The whole public site can read these, so rebuild broadly.
  await revalidatePcst(null, 'taxonomy');
  return { ok: true };
}
