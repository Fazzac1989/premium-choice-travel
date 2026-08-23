import Link from 'next/link';
import { pcstClient, isPcstConfigured, PCST_SITE_URL } from '@/lib/pcst';
import StTaxonomyManager, { type TaxonomyRow } from '@/components/admin/StTaxonomyManager';
import StCountryFacts, { type FactsRow } from '@/components/admin/StCountryFacts';
import StDestinationPages, { type DestinationRow } from '@/components/admin/StDestinationPages';

export const dynamic = 'force-dynamic';

const FACT_FIELDS = 'capital, currency, languages, timezone, population, best_time, avg_temp_c, facts_updated_at';

export default async function StCountriesPage() {
  if (!isPcstConfigured()) {
    return (
      <p className="card p-10 text-sm text-danger">
        The School Trips database is not configured. Set <code>PCST_SUPABASE_URL</code> and{' '}
        <code>PCST_SUPABASE_SERVICE_ROLE_KEY</code>.
      </p>
    );
  }

  const db = pcstClient();
  const withFacts = await db
    .from('countries')
    .select(`id, name, slug, region, trips(count), ${FACT_FIELDS}`)
    .order('name');

  // Safety net until the country-facts migration has been run.
  const pendingMigration = Boolean(withFacts.error);
  const data: any[] = pendingMigration
    ? (await db.from('countries').select('id, name, slug, region, trips(count)').order('name')).data ?? []
    : withFacts.data ?? [];

  const rows: TaxonomyRow[] = data.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    region: c.region,
    tripCount: c.trips?.[0]?.count ?? 0,
  }));

  const factsRows: FactsRow[] = data.map((c) => ({
    id: c.id,
    name: c.name,
    capital: c.capital ?? '',
    currency: c.currency ?? '',
    languages: c.languages ?? '',
    timezone: c.timezone ?? '',
    population: c.population ?? '',
    best_time: c.best_time ?? '',
    avg_temp_c: c.avg_temp_c === null || c.avg_temp_c === undefined ? null : Number(c.avg_temp_c),
    updatedAt: c.facts_updated_at ?? null,
  }));

  // Content and photography both live on the country row now, so one read
  // covers what the page builder needs to show as incomplete.
  const { data: contentRows } = await db
    .from('countries')
    .select('id, intro, content_updated_at, hero_image, hero_alt, gallery');
  const contentBy = new Map((contentRows ?? []).map((c: any) => [c.id, c]));

  const galleryUrls = (value: unknown): string[] =>
    Array.isArray(value)
      ? value.map((g: any) => (typeof g === 'string' ? g : g?.url)).filter((u: unknown): u is string => typeof u === 'string')
      : [];

  const pageRows: DestinationRow[] = data.map((c) => {
    const extra = contentBy.get(c.id);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      tripCount: c.trips?.[0]?.count ?? 0,
      hasContent: Boolean(extra?.intro),
      heroImage: extra?.hero_image ?? null,
      heroAlt: extra?.hero_alt ?? null,
      gallery: galleryUrls(extra?.gallery),
      contentUpdatedAt: extra?.content_updated_at ?? null,
    };
  });

  return (
    <>
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">
        ← School Trips
      </Link>
      <div className="mt-4">
        <p className="eyebrow">Premium Choice School Trips</p>
        <h1 className="font-serif text-3xl text-ink">Countries</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Destinations trips are filed under. Each has its own page on the School Trips site, plus a
          facts panel that appears beside the overview on every trip there.
        </p>
      </div>

      <StTaxonomyManager kind="country" rows={rows} />

      {pendingMigration ? (
        <p className="mt-14 border-t border-line pt-10 text-sm text-danger">
          Country facts are unavailable until the <code>20260813000000_country_facts.sql</code>{' '}
          migration has been run against the School Trips database.
        </p>
      ) : (
        <>
          <StCountryFacts rows={factsRows} configured={Boolean(process.env.ANTHROPIC_API_KEY)} />
          <StDestinationPages kind="country" rows={pageRows} siteUrl={PCST_SITE_URL} />
        </>
      )}
    </>
  );
}
