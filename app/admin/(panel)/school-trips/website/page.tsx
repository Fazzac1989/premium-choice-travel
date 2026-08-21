import Link from 'next/link';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import { DEFAULT_SETTINGS, DEFAULT_SAFETY, type SiteSettings, type SafetyPage } from '@/lib/st-site-defaults';
import StWebsiteForm from '@/components/admin/StWebsiteForm';

export const dynamic = 'force-dynamic';

/** Stored values win field by field; arrays replace wholesale. */
function merge<T>(base: T, over: unknown): T {
  if (over === null || over === undefined) return base;
  if (Array.isArray(base)) return (Array.isArray(over) && over.length ? over : base) as T;
  if (typeof base === 'object' && base !== null && typeof over === 'object') {
    const out: any = { ...base };
    for (const k of Object.keys(base as any)) out[k] = merge((base as any)[k], (over as any)[k]);
    return out;
  }
  return (typeof over === typeof base && over !== '' ? over : base) as T;
}

export default async function StWebsitePage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const db = pcstClient();
  const { data, error } = await db.from('site_settings').select('key, value');
  const stored = new Map((data ?? []).map((r: any) => [r.key, r.value]));

  const site: SiteSettings = merge(DEFAULT_SETTINGS, stored.get('site'));
  const safety: SafetyPage = merge(DEFAULT_SAFETY, stored.get('safety_page'));

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Website</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          The words and switches of the public site — the homepage, the consultation wording, the
          Health, Safety &amp; Security page, and whether the app is promoted. Saving republishes
          the site within a minute or two.
        </p>
      </div>

      {error && (
        <p className="card mt-6 p-6 text-sm text-danger">
          Settings cannot be saved until the <code>20260822000000_site_settings.sql</code> migration
          has been run against the School Trips database. The values below are the site&apos;s
          built-in wording.
        </p>
      )}

      <StWebsiteForm site={site} safety={safety} siteUrl={PCST_SITE_URL} />
    </>
  );
}
