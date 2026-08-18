import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStTrip, listStCountries, listStSubjects, PCST_SITE_URL } from '@/lib/pcst';
import StTripForm from '@/components/admin/StTripForm';

export const dynamic = 'force-dynamic';

export default async function EditStTripPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [trip, subjects, countries] = await Promise.all([
    getStTrip(id),
    listStSubjects(),
    listStCountries(),
  ]);
  if (!trip) notFound();

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
      <div className="mt-8">
        <StTripForm trip={trip} subjects={subjects} countries={countries} />
      </div>
    </div>
  );
}
