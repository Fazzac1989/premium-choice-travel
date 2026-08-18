import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapDestination, mapHotel } from '@/lib/data';
import HotelForm from '@/components/admin/HotelForm';

/** Full hotels manager — shared by the Group workspace and every brand workspace. */
export default async function HotelsManager() {
  const db = createAdminClient();
  const [{ data: hotelRows, error }, { data: destRows }] = await Promise.all([
    db.from('hotels').select('*').order('sort_order'),
    db.from('destinations').select('*').order('name'),
  ]);
  const destinations = (destRows ?? []).map(mapDestination);
  const hotels = (hotelRows ?? []).map(mapHotel);
  const destName = (id: number | null) => destinations.find((d) => d.id === id)?.name ?? '—';

  return (
    <>
      {error && (
        <p className="mt-4 rounded-xl bg-danger/10 p-4 text-sm text-danger">
          The hotels table isn’t migrated yet — paste supabase/RUN-ME.sql in the Supabase SQL editor.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {hotels.map((h) => (
          <details key={h.id} className="card group">
            <summary className="flex cursor-pointer items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-sand">
                {h.image && <Image src={h.image} alt="" fill sizes="80px" className="object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-ink">{h.name}</p>
                <p className="text-xs text-ink-soft">{destName(h.destinationId)}{h.area ? ` · ${h.area}` : ''}{h.style ? ` · ${h.style}` : ''}</p>
              </div>
              <span className="text-ink-soft transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div className="border-t border-line p-5">
              <HotelForm hotel={h} destinations={destinations} />
            </div>
          </details>
        ))}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="font-serif text-xl text-ink">Add a hotel</h2>
        <div className="mt-4">
          <HotelForm hotel={null} destinations={destinations} />
        </div>
      </div>
    </>
  );
}
