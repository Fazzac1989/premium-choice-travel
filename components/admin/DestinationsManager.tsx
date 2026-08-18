import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapDestination } from '@/lib/data';
import DestinationForm from '@/components/admin/DestinationForm';

/** Full destinations manager — shared by the Group workspace and brand workspaces. */
export default async function DestinationsManager() {
  const db = createAdminClient();
  const { data } = await db.from('destinations').select('*').order('sort_order');
  const destinations = (data ?? []).map(mapDestination);

  return (
    <>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {destinations.map((d) => (
          <details key={d.id} className="card group">
            <summary className="flex cursor-pointer items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-sand">
                {d.heroImage && <Image src={d.heroImage} alt="" fill sizes="80px" className="object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-ink">{d.name}</p>
                <p className="text-xs text-ink-soft">{d.region} {d.featured && '· featured'}</p>
              </div>
              <span className="text-ink-soft transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="border-t border-line p-5">
              <DestinationForm destination={d} />
            </div>
          </details>
        ))}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="font-serif text-xl text-ink">Add a destination</h2>
        <div className="mt-4">
          <DestinationForm destination={null} />
        </div>
      </div>
    </>
  );
}
