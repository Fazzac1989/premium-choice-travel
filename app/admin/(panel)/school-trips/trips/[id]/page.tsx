import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStTrip, listStCountries, listStSubjects, pcstClient, PCST_SITE_URL } from '@/lib/pcst';
import StTripForm from '@/components/admin/StTripForm';
import StStructureBanner from '@/components/admin/StStructureBanner';

export const dynamic = 'force-dynamic';
// The rebuild-summaries action on this page runs a Claude extraction per
// itinerary day; the default function timeout kills it mid-pass.
export const maxDuration = 120;

export default async function EditStTripPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [trip, subjects, countries] = await Promise.all([
    getStTrip(id),
    listStSubjects(),
    listStCountries(),
  ]);
  if (!trip) notFound();

  // Whether the scannable day cards exist, so a failed import pass is visible
  // here rather than only on the public page.
  const { data: dayRows } = await pcstClient()
    .from('itinerary_days')
    .select('structured_at, description')
    .eq('trip_id', id);
  const withText = (dayRows ?? []).filter((d) => d.description?.trim());
  const structuredDays = withText.filter((d) => d.structured_at).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">← School Trips</Link>
        {trip.status === 'published' && (
          <a href={`${PCST_SITE_URL}/trips/${trip.slug}`} target="_blank" rel="noopener" className="text-sm font-semibold text-teal-deep hover:underline">
            View on website ↗
          </a>
        )}
      </div>
      <h1 className="mt-2 font-serif text-3xl text-ink">{trip.title}</h1>
      <StStructureBanner tripId={id} structuredDays={structuredDays} totalDays={withText.length} />
      <div className="mt-8">
        <StTripForm trip={trip} subjects={subjects} countries={countries} />
      </div>
    </div>
  );
}
