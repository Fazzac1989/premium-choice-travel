import { notFound } from 'next/navigation';
import SavedStays from '@/components/staycations/coastal/SavedStays';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { criteriaQuery, parseCriteria } from '@/lib/staycations/search-criteria';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Saved',
  description: 'The stays you have shortlisted.',
  robots: { index: false, follow: false },
};

export default function SavedPage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);
  // Dates carry into a saved stay, so the price shown there is for the trip
  // being planned rather than for whenever it happened to be saved.
  const query = criteriaQuery(parseCriteria(searchParams));

  return (
    <div className="cc-wrap py-6 lg:py-10">
      <h1 className="cc-h2">Saved</h1>
      <p className="cc-body mt-1 text-sea-soft">Your shortlist, ready to compare.</p>
      <div className="mt-5">
        <SavedStays base={base} searchQuery={query} />
      </div>
    </div>
  );
}
