import 'server-only';
import { PCST_SITE_URL } from '@/lib/pcst';

/**
 * Ask the School Trips site to rebuild its cached pages.
 *
 * This admin writes straight into the School Trips database, but that site is a
 * separate, statically generated deployment: `revalidatePath` here only affects
 * pages this app renders. Without this ping a published trip stays invisible on
 * the public site until its next deploy.
 *
 * Always rebuilds the home page and the trips index; pass a slug to rebuild
 * that trip's own page too.
 */
export async function revalidatePcst(slug?: string | null) {
  const secret = process.env.PCST_REVALIDATE_SECRET;
  if (!secret) {
    console.warn(
      '[school-trips] PCST_REVALIDATE_SECRET not set — the public site will stay stale until it is redeployed'
    );
    return;
  }

  const url =
    `${PCST_SITE_URL}/api/revalidate?secret=${encodeURIComponent(secret)}` +
    (slug ? `&slug=${encodeURIComponent(slug)}` : '');

  try {
    const res = await fetch(url, { method: 'POST', cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[school-trips] revalidate returned ${res.status}; public pages may be stale`);
    }
  } catch {
    console.warn('[school-trips] revalidate call failed; public pages may be stale');
  }
}
