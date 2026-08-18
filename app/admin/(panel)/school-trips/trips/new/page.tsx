import Link from 'next/link';
import { listStCountries, listStSubjects } from '@/lib/pcst';
import StTripForm from '@/components/admin/StTripForm';

export const dynamic = 'force-dynamic';

export default async function NewStTripPage() {
  const [subjects, countries] = await Promise.all([listStSubjects(), listStCountries()]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/school-trips" className="text-sm font-semibold text-teal-deep hover:underline">← School Trips</Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">New trip</h1>
      <div className="mt-8">
        <StTripForm trip={null} subjects={subjects} countries={countries} />
      </div>
    </div>
  );
}
